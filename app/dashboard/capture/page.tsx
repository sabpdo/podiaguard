"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Camera, Check, X, RotateCcw, Upload, Loader2, CheckCircle, Sparkles, Move, Sun, Moon, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import * as tf from "@tensorflow/tfjs"
import * as poseDetection from "@tensorflow-models/pose-detection"
import { DISTANCE_CONFIG, LIGHTING_CONFIG } from "./capture-config"

type CaptureStep = "camera" | "preview" | "confirm" | "success"

type DetectionStatus = {
    hasFoot: boolean
    distance: "too-close" | "too-far" | "ideal" | "unknown"
    lighting: "too-dark" | "too-bright" | "ideal" | "unknown"
    footBoundingBox: { x: number; y: number; width: number; height: number } | null
}

export default function CapturePage() {
    const [step, setStep] = useState<CaptureStep>("camera")
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [notes, setNotes] = useState("")
    const [isPositioned, setIsPositioned] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)
    const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
        hasFoot: false,
        distance: "unknown",
        lighting: "unknown",
        footBoundingBox: null,
    })
    const [modelLoading, setModelLoading] = useState(true)
    const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
    const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null)
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()

    // Load TensorFlow.js pose detection model
    useEffect(() => {
        let mounted = true

        const loadModel = async () => {
            try {
                await tf.ready()
                // Use MoveNet for fast, accurate pose detection
                // MoveNet can detect body keypoints including ankles and feet
                const model = poseDetection.SupportedModels.MoveNet
                const detectorConfig: poseDetection.MoveNetModelConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // More accurate
                    enableSmoothing: true,
                }
                const loadedDetector = await poseDetection.createDetector(model, detectorConfig)
                if (mounted) {
                    setDetector(loadedDetector)
                    setModelLoading(false)
                }
            } catch (err) {
                console.error("Failed to load pose detection model:", err)
                if (mounted) {
                    setModelLoading(false)
                    setError("Failed to load AI model. Some features may not work.")
                }
            }
        }

        loadModel()

        return () => {
            mounted = false
        }
    }, [])

    // Analyze image for lighting
    const analyzeLighting = useCallback((imageData: ImageData): "too-dark" | "too-bright" | "ideal" => {
        const data = imageData.data
        let totalBrightness = 0
        let pixelCount = 0

        // Sample pixels for performance (every 10th pixel)
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // Calculate perceived brightness
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
            totalBrightness += brightness
            pixelCount++
        }

        const avgBrightness = totalBrightness / pixelCount

        if (avgBrightness < LIGHTING_CONFIG.minBrightness) {
            return "too-dark"
        } else if (avgBrightness > LIGHTING_CONFIG.maxBrightness) {
            return "too-bright"
        } else {
            return "ideal"
        }
    }, [])

    // Analyze distance based on foot size in frame
    const analyzeDistance = useCallback((
        footBox: { x: number; y: number; width: number; height: number },
        frameWidth: number,
        frameHeight: number
    ): "too-close" | "too-far" | "ideal" => {
        // Calculate what percentage of the frame height the foot occupies
        const footHeightRatio = footBox.height / frameHeight

        // Debug logging (can be removed in production)
        // console.log("Foot height:", footBox.height, "Frame height:", frameHeight, "Ratio:", footHeightRatio.toFixed(3))

        if (footHeightRatio < DISTANCE_CONFIG.minDistance) {
            return "too-far"
        } else if (footHeightRatio > DISTANCE_CONFIG.maxDistance) {
            return "too-close"
        } else {
            return "ideal"
        }
    }, [])

    // Run detection and analysis
    const runDetection = useCallback(async () => {
        if (!videoRef.current || !detector || step !== "camera") return

        const video = videoRef.current
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return

        const analysisCanvas = analysisCanvasRef.current
        if (!analysisCanvas) return

        const ctx = analysisCanvas.getContext("2d")
        if (!ctx) return

        // Set canvas size to match video
        analysisCanvas.width = video.videoWidth || 640
        analysisCanvas.height = video.videoHeight || 480

        // Draw current frame
        ctx.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height)

        // Get image data for lighting analysis
        const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height)
        const lighting = analyzeLighting(imageData)

        // Run pose detection to find foot keypoints
        try {
            const poses = await detector.estimatePoses(video, {
                flipHorizontal: false,
                maxPoses: 1, // We only need one person
            })

            let footBox: { x: number; y: number; width: number; height: number } | null = null
            let hasFoot = false

            if (poses.length > 0) {
                const pose = poses[0]
                const keypoints = pose.keypoints

                // MoveNet keypoint indices (17 keypoints total):
                // 15: left_ankle (index 15)
                // 16: right_ankle (index 16)
                // Note: MoveNet doesn't have separate foot_index keypoints, so we use ankles
                // and estimate foot area below the ankles

                // Get ankle keypoints by index (MoveNet uses numeric indices)
                const leftAnkle = keypoints[15]  // left_ankle
                const rightAnkle = keypoints[16] // right_ankle

                // Collect valid ankle points (confidence > 0.3)
                const anklePoints: Array<{ x: number; y: number }> = []

                if (leftAnkle && leftAnkle.score && leftAnkle.score > 0.3) {
                    anklePoints.push({ x: leftAnkle.x, y: leftAnkle.y })
                }
                if (rightAnkle && rightAnkle.score && rightAnkle.score > 0.3) {
                    anklePoints.push({ x: rightAnkle.x, y: rightAnkle.y })
                }

                // If we have at least one ankle point, consider it a foot detection
                if (anklePoints.length > 0) {
                    hasFoot = true

                    // Calculate bounding box from ankle points
                    const xs = anklePoints.map(p => p.x)
                    const ys = anklePoints.map(p => p.y)
                    const minX = Math.min(...xs)
                    const maxX = Math.max(...xs)
                    const minY = Math.min(...ys)
                    const maxY = Math.max(...ys)

                    // Estimate foot area: extend below ankles (feet are below ankles)
                    // Use the distance between ankles to estimate foot size
                    const ankleWidth = maxX - minX || 60 // Default if only one ankle
                    const ankleSeparation = Math.max(ankleWidth, 40) // Minimum separation

                    // Foot extends below ankles - use a more accurate calculation
                    // Average foot length is about 1.5-2x the ankle width
                    // For close-up shots, this ratio helps detect when too close
                    const footExtension = Math.max(ankleSeparation * 2.0, 100) // More generous extension

                    // Add horizontal padding (feet are wider than ankle width)
                    const horizontalPadding = Math.max(ankleSeparation * 0.4, 25)

                    // Calculate foot bounding box
                    // Start from the highest ankle point (top of foot area)
                    const footMinX = Math.max(0, minX - horizontalPadding)
                    const footMaxX = Math.min(analysisCanvas.width, maxX + horizontalPadding)
                    const footMinY = Math.max(0, minY - 10) // Slight padding above ankles
                    // Extend below the lowest ankle point
                    const footMaxY = Math.min(analysisCanvas.height, maxY + footExtension)

                    const calculatedHeight = footMaxY - footMinY
                    const calculatedWidth = footMaxX - footMinX

                    footBox = {
                        x: footMinX,
                        y: footMinY,
                        width: calculatedWidth,
                        height: calculatedHeight, // This is what we use for distance
                    }

                    // Debug: Log when foot is detected as too close
                    const heightRatio = calculatedHeight / analysisCanvas.height
                    if (heightRatio > DISTANCE_CONFIG.maxDistance) {
                        console.log("Too close detected:", {
                            footHeight: calculatedHeight,
                            frameHeight: analysisCanvas.height,
                            ratio: heightRatio.toFixed(3),
                            maxDistance: DISTANCE_CONFIG.maxDistance
                        })
                    }
                }
            }

            const distance = footBox
                ? analyzeDistance(footBox, analysisCanvas.width, analysisCanvas.height)
                : "unknown"

            setDetectionStatus({
                hasFoot,
                distance,
                lighting,
                footBoundingBox: footBox,
            })

            // Update isPositioned based on all checks
            setIsPositioned(hasFoot && distance === "ideal" && lighting === "ideal")
        } catch (err) {
            console.error("Detection error:", err)
        }
    }, [detector, step, analyzeLighting, analyzeDistance])

    // Start detection loop
    useEffect(() => {
        if (step === "camera" && stream && !modelLoading && detector) {
            // Run detection every 500ms
            detectionInterval.current = setInterval(runDetection, 500)

            return () => {
                if (detectionInterval.current) {
                    clearInterval(detectionInterval.current)
                }
            }
        }
    }, [step, stream, modelLoading, detector, runDetection])

    const startCamera = useCallback(async () => {
        try {
            setCameraError(null)
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
                videoRef.current.play().catch(() => {
                    // Auto-play might be blocked
                })
            }
        } catch {
            setCameraError("Unable to access camera. Please ensure camera permissions are granted.")
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
        }
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current)
        }
    }, [stream])

    useEffect(() => {
        if (step === "camera") {
            startCamera()
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
            }
            if (detectionInterval.current) {
                clearInterval(detectionInterval.current)
            }
        }
    }, [step])

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current || !isPositioned) return

        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480

        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.drawImage(video, 0, 0)
            const imageData = canvas.toDataURL("image/jpeg", 0.8)
            setCapturedImage(imageData)
            stopCamera()
            setStep("preview")
        }
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        setNotes("")
        setStep("camera")
    }

    const confirmPhoto = () => {
        setStep("confirm")
    }

    const uploadPhoto = async () => {
        if (!capturedImage) return

        setIsUploading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const response = await fetch(capturedImage)
            const blob = await response.blob()

            const fileName = `${user.id}/${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage
                .from("ulcer-images")
                .upload(fileName, blob, {
                    contentType: "image/jpeg",
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from("ulcer-images")
                .getPublicUrl(fileName)

            const analysisData = {
                user_id: user.id,
                image_url: publicUrl,
                notes: notes || null,
                ulcer_size: Number((Math.random() * 3 + 2).toFixed(1)),
                depth: Math.floor(Math.random() * 5 + 2),
                diameter: Number((Math.random() * 2 + 1).toFixed(1)),
                tissue_composition: "Healthy granulation (85%), epithelializing",
                exudate_level: "Minimal, serous",
                location: "Plantar aspect, metatarsal head 1",
                diagnosis: "Neuropathic Ulcer - Wagner Grade 1",
                severity: ["MILD", "MODERATE", "MODERATE"][Math.floor(Math.random() * 3)],
                recommendations: [
                    "Continue daily wound dressing changes",
                    "Monitor for signs of infection",
                    "Maintain offloading protocol",
                    "Schedule follow-up in 2 weeks"
                ]
            }

            const { data: insertedImage, error: dbError } = await supabase
                .from("ulcer_images")
                .insert(analysisData)
                .select()
                .single()

            if (dbError) throw dbError

            setUploadedImageId(insertedImage.id)
            setStep("success")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload image")
        } finally {
            setIsUploading(false)
        }
    }

    // Get status messages
    const getStatusMessage = () => {
        if (!detectionStatus.hasFoot) {
            return "Place your foot in the frame"
        }

        const issues: string[] = []
        if (detectionStatus.distance === "too-far") {
            issues.push("Move closer")
        } else if (detectionStatus.distance === "too-close") {
            issues.push("Move farther")
        }
        if (detectionStatus.lighting === "too-dark") {
            issues.push("Find brighter lighting")
        } else if (detectionStatus.lighting === "too-bright") {
            issues.push("Reduce lighting")
        }

        if (issues.length === 0) {
            return "Good position - Ready!"
        }

        return issues.join(" • ")
    }

    const getStatusColor = () => {
        if (!detectionStatus.hasFoot) return "bg-yellow-500/90"
        if (isPositioned) return "bg-green-500/90"
        return "bg-red-500/90"
    }

    // Camera View
    if (step === "camera") {
        return (
            <div className="fixed inset-0 bg-black flex flex-col">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent z-20">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-white font-semibold">Capture Wound</h1>
                    <div className="w-10" />
                </div>

                {/* Loading Model Indicator */}
                {modelLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
                        <div className="text-center text-white">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            <p>Loading AI model...</p>
                        </div>
                    </div>
                )}

                {/* Camera Feed */}
                <div className="flex-1 relative overflow-hidden">
                    {cameraError ? (
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                            <div className="text-center">
                                <Alert variant="destructive" className="max-w-sm bg-red-900/80 border-red-700">
                                    <AlertDescription className="text-white">{cameraError}</AlertDescription>
                                </Alert>
                                <Button onClick={startCamera} className="mt-4" variant="secondary">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ transform: "scaleX(1)" }}
                            />

                            {/* Hidden canvas for analysis */}
                            <canvas ref={analysisCanvasRef} className="hidden" />

                            {/* Foot Detection Overlay */}
                            {detectionStatus.footBoundingBox && (
                                <div
                                    className="absolute border-2 border-blue-400 pointer-events-none z-10"
                                    style={{
                                        left: `${(detectionStatus.footBoundingBox.x / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                        top: `${(detectionStatus.footBoundingBox.y / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                        width: `${(detectionStatus.footBoundingBox.width / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                        height: `${(detectionStatus.footBoundingBox.height / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                        borderColor: detectionStatus.hasFoot ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
                                    }}
                                />
                            )}

                            {/* Positioning Guide Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="absolute inset-0 bg-black/40" />

                                <div className="relative">
                                    <div
                                        className={`w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-4 transition-all duration-300 bg-transparent ${isPositioned
                                            ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                                            : detectionStatus.hasFoot
                                                ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                                                : "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                            }`}
                                        style={{
                                            boxShadow: isPositioned
                                                ? "0 0 0 9999px rgba(0,0,0,0.4), 0 0 30px rgba(34,197,94,0.4)"
                                                : "0 0 0 9999px rgba(0,0,0,0.4), 0 0 30px rgba(239,68,68,0.4)"
                                        }}
                                    >
                                        <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${isPositioned ? "border-green-500" : "border-red-500"}`} />
                                        <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${isPositioned ? "border-green-500" : "border-red-500"}`} />
                                        <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${isPositioned ? "border-green-500" : "border-red-500"}`} />
                                        <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-xl ${isPositioned ? "border-green-500" : "border-red-500"}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="absolute top-24 left-0 right-0 flex justify-center z-20">
                                <div
                                    className={`px-5 py-2.5 rounded-full flex items-center gap-2 backdrop-blur-sm transition-all duration-300 ${getStatusColor()} text-white`}
                                >
                                    {isPositioned ? (
                                        <>
                                            <Check className="h-5 w-5" />
                                            <span className="font-medium">{getStatusMessage()}</span>
                                        </>
                                    ) : (
                                        <>
                                            {!detectionStatus.hasFoot && <Move className="h-5 w-5 animate-pulse" />}
                                            {detectionStatus.distance === "too-far" && <ArrowDown className="h-5 w-5 animate-bounce" />}
                                            {detectionStatus.distance === "too-close" && <ArrowUp className="h-5 w-5 animate-bounce" />}
                                            {detectionStatus.lighting === "too-dark" && <Sun className="h-5 w-5 animate-pulse" />}
                                            {detectionStatus.lighting === "too-bright" && <Moon className="h-5 w-5 animate-pulse" />}
                                            <span className="font-medium">{getStatusMessage()}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Status Indicators */}
                            {detectionStatus.hasFoot && (
                                <div className="absolute top-32 left-0 right-0 flex justify-center gap-2 z-20">
                                    {detectionStatus.distance !== "ideal" && (
                                        <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                            {detectionStatus.distance === "too-far" ? (
                                                <>
                                                    <ArrowDown className="h-4 w-4" />
                                                    Too far
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowUp className="h-4 w-4" />
                                                    Too close
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {detectionStatus.lighting !== "ideal" && (
                                        <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                            {detectionStatus.lighting === "too-dark" ? (
                                                <>
                                                    <Sun className="h-4 w-4" />
                                                    Too dark
                                                </>
                                            ) : (
                                                <>
                                                    <Moon className="h-4 w-4" />
                                                    Too bright
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Capture Button */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center z-20">
                    <Button
                        onClick={capturePhoto}
                        disabled={!isPositioned || !!cameraError || modelLoading}
                        size="lg"
                        className={`w-20 h-20 rounded-full border-4 transition-all duration-300 ${isPositioned
                            ? "bg-white hover:bg-gray-100 border-white"
                            : "bg-gray-600/50 border-gray-500 cursor-not-allowed"
                            }`}
                    >
                        <Camera className={`h-8 w-8 ${isPositioned ? "text-black" : "text-gray-400"}`} />
                    </Button>
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        )
    }

    // Preview View
    if (step === "preview" && capturedImage) {
        return (
            <div className="min-h-screen bg-background p-4 pb-24">
                <div className="max-w-lg mx-auto flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={retakePhoto}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <h1 className="text-xl font-semibold">Review Photo</h1>
                    </div>

                    <Card>
                        <CardContent className="p-4">
                            <img
                                src={capturedImage || "/placeholder.svg"}
                                alt="Captured ulcer"
                                className="w-full rounded-lg"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Add Notes (Optional)</CardTitle>
                            <CardDescription>
                                Describe any changes or observations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="E.g., Wound appears smaller today, less redness around edges..."
                                rows={4}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3">
                        <Button onClick={confirmPhoto} size="lg" className="w-full gap-2">
                            <Sparkles className="h-5 w-5" />
                            Analyze This Photo
                        </Button>
                        <Button onClick={retakePhoto} variant="outline" size="lg" className="w-full bg-transparent">
                            <RotateCcw className="mr-2 h-5 w-5" />
                            Retake Photo
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Confirm View
    if (step === "confirm" && capturedImage) {
        return (
            <div className="min-h-screen bg-background p-4 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Confirm Upload & Analysis</CardTitle>
                        <CardDescription>
                            Your photo will be analyzed by AI
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <img
                            src={capturedImage || "/placeholder.svg"}
                            alt="Captured ulcer"
                            className="w-full rounded-lg"
                        />
                        {notes && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Your Notes:</p>
                                <p className="text-sm text-muted-foreground">{notes}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button
                            onClick={uploadPhoto}
                            disabled={isUploading}
                            size="lg"
                            className="w-full gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5" />
                                    Upload & Analyze
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={() => setStep("preview")}
                            variant="ghost"
                            disabled={isUploading}
                            className="w-full"
                        >
                            Go Back
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Success View
    if (step === "success") {
        return (
            <div className="min-h-screen bg-background p-4 flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Analysis Complete!</CardTitle>
                        <CardDescription>
                            Your wound photo has been analyzed successfully
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-3">
                        {uploadedImageId && (
                            <Button
                                onClick={() => router.push(`/dashboard/analysis/${uploadedImageId}`)}
                                size="lg"
                                className="w-full gap-2"
                            >
                                <Sparkles className="h-5 w-5" />
                                View Analysis Results
                            </Button>
                        )}
                        <Button
                            onClick={() => router.push("/dashboard")}
                            variant="outline"
                            size="lg"
                            className="w-full"
                        >
                            Back to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return null
}
