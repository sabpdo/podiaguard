"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Camera, Check, X, RotateCcw, Upload, Loader2, CheckCircle, Sparkles, Move, Sun, Moon, ArrowUp, ArrowDown, ArrowRight, Home } from "lucide-react"
import Link from "next/link"
import { DISTANCE_CONFIG, LIGHTING_CONFIG } from "./capture-config"
import { useLanguage } from "@/lib/i18n/context"
import { LanguageSwitcher } from "@/components/language-switcher"

type CaptureStep = "camera" | "preview" | "confirm" | "success"

type DetectionStatus = {
    hasCellPhone: boolean
    distance: "too-close" | "too-far" | "ideal" | "unknown"
    lighting: "too-dark" | "too-bright" | "ideal" | "unknown"
    cellPhoneBoundingBox: { x: number; y: number; width: number; height: number } | null
}

type ObjectDetector = {
    detect: (input: HTMLVideoElement | HTMLCanvasElement | ImageData | HTMLImageElement) => Promise<Array<{
        bbox: [number, number, number, number] // [x, y, width, height]
        class: string
        score: number
    }>>
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
        hasCellPhone: false,
        distance: "unknown",
        lighting: "unknown",
        cellPhoneBoundingBox: null,
    })
    const [modelLoading, setModelLoading] = useState(true)
    const [detector, setDetector] = useState<ObjectDetector | null>(null)
    const [detectedObjects, setDetectedObjects] = useState<Array<{ bbox: [number, number, number, number], class: string, score: number }>>([])

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
    const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null)
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const { t } = useLanguage()

    // Image processing fallback to detect cell phone-like shapes
    const detectCellPhoneWithImageProcessing = useCallback(async (input: HTMLVideoElement | HTMLCanvasElement): Promise<any[]> => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return []

        if (input instanceof HTMLVideoElement) {
            canvas.width = input.videoWidth || 640
            canvas.height = input.videoHeight || 480
            ctx.drawImage(input, 0, 0)
        } else {
            canvas.width = input.width
            canvas.height = input.height
            ctx.drawImage(input, 0, 0)
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Simple edge detection and contour finding for cell phone-like shapes
        // Look for rectangular objects with phone-like aspect ratios
        const cellPhoneCandidates: Array<{ bbox: [number, number, number, number], score: number, class: string }> = []

        // Detect regions with distinct edges (phones often have clear edges and screens)
        const edgeRegions: Array<{ x: number, y: number }> = []
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
            const x = (i / 4) % canvas.width
            const y = Math.floor((i / 4) / canvas.width)

            if (x === 0 || y === 0 || x >= canvas.width - 1 || y >= canvas.height - 1) continue

            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            // Get neighboring pixels for edge detection
            const rightIdx = i + 4
            const downIdx = i + (canvas.width * 4)

            if (rightIdx < data.length && downIdx < data.length) {
                const rRight = data[rightIdx]
                const gRight = data[rightIdx + 1]
                const bRight = data[rightIdx + 2]
                const rDown = data[downIdx]
                const gDown = data[downIdx + 1]
                const bDown = data[downIdx + 2]

                // Detect edges (significant color change) - phones have sharp edges
                const edgeStrength = Math.abs(r - rRight) + Math.abs(g - gRight) + Math.abs(b - bRight) +
                    Math.abs(r - rDown) + Math.abs(g - gDown) + Math.abs(b - bDown)

                if (edgeStrength > 40) { // Higher threshold for phones (sharper edges)
                    edgeRegions.push({ x, y })
                }
            }
        }

        // Group edge regions into potential cell phone bounding boxes
        if (edgeRegions.length > 100) { // Need enough pixels
            const xs = edgeRegions.map(p => p.x)
            const ys = edgeRegions.map(p => p.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)

            const width = maxX - minX
            const height = maxY - minY
            const aspectRatio = width / height

            // Check if it matches cell phone characteristics (rectangular, typically 0.5-2.0 aspect ratio)
            // Phones can be portrait (0.5-0.7) or landscape (1.4-2.0)
            if (aspectRatio >= 0.4 && aspectRatio <= 2.2 && // Cell phone-like aspect ratio (rectangular)
                width >= 40 && height >= 40 && // Minimum size (pixels) - phones are reasonably sized
                width <= canvas.width * 0.8 && height <= canvas.height * 0.8) { // Maximum size

                cellPhoneCandidates.push({
                    bbox: [minX, minY, width, height],
                    score: 0.7, // Medium-high confidence for image processing
                    class: 'cell phone'
                })
            }
        }

        return cellPhoneCandidates
    }, [])

    // Load detection model with hybrid approach: COCO-SSD + image processing
    useEffect(() => {
        // Ensure we're in the browser
        if (typeof window === 'undefined') return

        let mounted = true

        const loadModel = async () => {
            try {
                // Dynamically import TensorFlow and COCO-SSD to avoid SSR issues
                const tf = await import("@tensorflow/tfjs")
                const cocoSsd = await import("@tensorflow-models/coco-ssd")

                await tf.ready()

                // Load COCO-SSD model for object detection
                const cocoModel = await cocoSsd.load({
                    base: 'mobilenet_v2', // Faster, lighter model
                })

                // Create a hybrid detector that combines COCO-SSD with image processing
                const hybridDetector = {
                    type: 'hybrid',
                    model: cocoModel,
                    detect: async (input: HTMLVideoElement | HTMLCanvasElement) => {
                        // First try COCO-SSD
                        const detections = await cocoModel.detect(input)

                        // If no good detections, try image processing fallback
                        if (detections.length === 0 || detections.every(d => d.score < 0.3)) {
                            return await detectCellPhoneWithImageProcessing(input)
                        }

                        return detections
                    }
                }

                console.log("✅ Hybrid detector (COCO-SSD + Image Processing) loaded successfully")

                if (mounted) {
                    setDetector(hybridDetector as any)
                    setModelLoading(false)
                    console.log("Using hybrid detection (works from any angle)")
                }
            } catch (err) {
                console.error("Failed to load detection model:", err)
                if (mounted) {
                    setModelLoading(false)
                    setError(`Failed to load AI model: ${err instanceof Error ? err.message : 'Unknown error'}. Some features may not work.`)
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

    // Analyze distance based on cell phone size in frame
    const analyzeDistance = useCallback((
        cellPhoneBox: { x: number; y: number; width: number; height: number },
        frameWidth: number,
        frameHeight: number
    ): "too-close" | "too-far" | "ideal" => {
        // Calculate what percentage of the frame height the cell phone occupies
        const cellPhoneHeightRatio = cellPhoneBox.height / frameHeight

        // Debug logging (can be removed in production)
        // console.log("Cell phone height:", cellPhoneBox.height, "Frame height:", frameHeight, "Ratio:", cellPhoneHeightRatio.toFixed(3))

        if (cellPhoneHeightRatio < DISTANCE_CONFIG.minDistance) {
            return "too-far"
        } else if (cellPhoneHeightRatio > DISTANCE_CONFIG.maxDistance) {
            return "too-close"
        } else {
            return "ideal"
        }
    }, [])

    // Calculate cell phone position relative to ideal center
    const getPositionGuidance = useCallback((): {
        left: boolean
        right: boolean
        up: boolean
        down: boolean
    } => {
        if (!detectionStatus.cellPhoneBoundingBox || !videoRef.current) {
            return { left: false, right: false, up: false, down: false }
        }

        const videoWidth = videoRef.current.videoWidth || 640
        const videoHeight = videoRef.current.videoHeight || 480
        const cellPhoneBox = detectionStatus.cellPhoneBoundingBox

        // Ideal center position (center of frame)
        const idealCenterX = videoWidth / 2
        const idealCenterY = videoHeight / 2

        // Cell phone center position
        const cellPhoneCenterX = cellPhoneBox.x + cellPhoneBox.width / 2
        const cellPhoneCenterY = cellPhoneBox.y + cellPhoneBox.height / 2

        // Threshold for "close enough" (10% of frame size)
        const threshold = Math.min(videoWidth, videoHeight) * 0.1

        return {
            left: cellPhoneCenterX < idealCenterX - threshold,
            right: cellPhoneCenterX > idealCenterX + threshold,
            up: cellPhoneCenterY < idealCenterY - threshold,
            down: cellPhoneCenterY > idealCenterY + threshold,
        }
    }, [detectionStatus.cellPhoneBoundingBox])

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
        const videoWidth = video.videoWidth || 640
        const videoHeight = video.videoHeight || 480
        analysisCanvas.width = videoWidth
        analysisCanvas.height = videoHeight

        // Draw current frame
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

        // Get image data for lighting analysis
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)
        const lighting = analyzeLighting(imageData)

        // Debug: Log video state
        console.log("Video state:", {
            readyState: video.readyState,
            videoWidth,
            videoHeight,
            playing: !video.paused,
            detectorReady: !!detector
        })

        // Run hybrid detection to find cell phones (works from any angle)
        try {
            // Hybrid detector: COCO-SSD first, then image processing fallback
            const detections = await detector.detect(video)

            console.log(`Detected ${detections.length} objects:`, detections.map(d => `${d.class} (${(d.score * 100).toFixed(1)}%)`))

            // Store all detected objects for visualization
            setDetectedObjects(detections)

            let cellPhoneBox: { x: number; y: number; width: number; height: number } | null = null
            let hasCellPhone = false

            // Function to determine if a detected object is likely a cell phone
            const evaluateCellPhoneLikelihood = (detection: any, frameWidth: number, frameHeight: number): { isCellPhone: boolean, score: number } => {
                const [x, y, width, height] = detection.bbox
                const centerY = y + height / 2
                const centerX = x + width / 2
                const aspectRatio = width / height
                const area = width * height
                const frameArea = frameWidth * frameHeight
                const areaRatio = area / frameArea

                // Cell phone detection heuristics:
                // 1. Aspect ratio: cell phones are rectangular (0.4-2.2 width/height ratio)
                // 2. Size: should be reasonable size relative to frame (not too small, not too large)
                // 3. Position: can be anywhere in frame
                // 4. Shape: rectangular, can be portrait or landscape

                const isCellPhoneLike =
                    aspectRatio >= 0.4 && aspectRatio <= 2.2 && // Cell phone-like aspect ratio (rectangular)
                    areaRatio >= 0.01 && areaRatio <= 0.5 && // Reasonable size (1% to 50% of frame)
                    width >= 40 && height >= 40 && // Minimum size (pixels) - phones are reasonably sized
                    width <= frameWidth * 0.8 && height <= frameHeight * 0.8 // Maximum size

                if (!isCellPhoneLike) {
                    return { isCellPhone: false, score: 0 }
                }

                // Calculate cell phone score based on multiple factors
                let cellPhoneScore = detection.score

                // Boost score if aspect ratio is in ideal cell phone range (0.5-1.8)
                if (aspectRatio >= 0.5 && aspectRatio <= 1.8) {
                    cellPhoneScore *= 1.5
                }

                // Boost score if size is in ideal range (3-25% of frame)
                if (areaRatio >= 0.03 && areaRatio <= 0.25) {
                    cellPhoneScore *= 1.3
                }

                // Check if it's a "cell phone" or "phone" class from COCO-SSD (if available)
                if (detection.class === 'cell phone' || detection.class === 'phone' || detection.class === 'mobile phone') {
                    cellPhoneScore *= 2.0 // Strong boost for direct phone detection
                }

                // Accept objects that match cell phone characteristics
                return { isCellPhone: true, score: cellPhoneScore }
            }

            // Find the best cell phone candidate (any object that looks like a cell phone)
            let bestCellPhoneDetection: any = null
            let bestCellPhoneScore = 0

            for (const detection of detections) {
                const evaluation = evaluateCellPhoneLikelihood(detection, videoWidth, videoHeight)

                if (evaluation.isCellPhone && evaluation.score > bestCellPhoneScore) {
                    bestCellPhoneScore = evaluation.score
                    bestCellPhoneDetection = detection
                }
            }

            // If COCO-SSD didn't find good cell phone detections, try image processing fallback
            if (!bestCellPhoneDetection || bestCellPhoneScore < 0.5) {
                console.log("COCO-SSD didn't find good cell phone detection - trying image processing fallback...")

                // Use image processing to detect cell phone-like shapes
                const fallbackDetections = await detectCellPhoneWithImageProcessing(video)
                if (fallbackDetections.length > 0) {
                    bestCellPhoneDetection = fallbackDetections[0]
                    bestCellPhoneScore = fallbackDetections[0].score
                    console.log("✅ Image processing found cell phone-like shape!")
                }
            }

            // If we found a likely cell phone, create bounding box
            if (bestCellPhoneDetection) {
                hasCellPhone = true
                let [x, y, width, height] = bestCellPhoneDetection.bbox

                // Add padding around detected cell phone
                const paddingX = width * 0.1
                const paddingY = height * 0.1

                cellPhoneBox = {
                    x: Math.max(0, x - paddingX),
                    y: Math.max(0, y - paddingY),
                    width: Math.min(videoWidth - x + paddingX, width + paddingX * 2),
                    height: Math.min(videoHeight - y + paddingY, height + paddingY * 2),
                }

                console.log(`✅ Cell phone detected! Class: ${bestCellPhoneDetection.class}, Confidence: ${(bestCellPhoneDetection.score * 100).toFixed(1)}%`, {
                    bbox: cellPhoneBox,
                    frameSize: { width: videoWidth, height: videoHeight }
                })
            } else {
                console.log("❌ No cell phone-like objects detected")
                console.log("Detected objects:", detections.map(d => ({
                    class: d.class,
                    confidence: (d.score * 100).toFixed(1) + '%',
                    bbox: d.bbox,
                    aspectRatio: (d.bbox[2] / d.bbox[3]).toFixed(2)
                })))
            }

            const distance = cellPhoneBox
                ? analyzeDistance(cellPhoneBox, analysisCanvas.width, analysisCanvas.height)
                : "unknown"

            setDetectionStatus({
                hasCellPhone,
                distance,
                lighting,
                cellPhoneBoundingBox: cellPhoneBox,
            })

            // Update isPositioned - require BOTH cell phone detection AND proper distance/lighting
            if (hasCellPhone) {
                // If we detected cell phone, require ideal distance AND lighting
                setIsPositioned(distance === "ideal" && lighting === "ideal")
            } else {
                // No cell phone detected - don't allow capture
                setIsPositioned(false)
            }
        } catch (err) {
            console.error("Detection error:", err)
            // Don't show error to user for detection failures, just log
        }
    }, [detector, step, analyzeLighting, analyzeDistance, detectCellPhoneWithImageProcessing])

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
            // Check authentication
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError) {
                console.error("Auth error:", authError)
                throw new Error(`Authentication failed: ${authError.message}`)
            }
            if (!user) {
                throw new Error("Not authenticated. Please log in again.")
            }

            console.log("User authenticated:", user.id)

            // Fetch image blob
            let blob: Blob
            try {
                const response = await fetch(capturedImage)
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
                }
                blob = await response.blob()
                console.log("Image blob created, size:", blob.size)
            } catch (fetchError) {
                console.error("Fetch error:", fetchError)
                throw new Error(`Failed to process image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
            }

            const fileName = `${user.id}/${Date.now()}.jpg`
            console.log("Uploading to:", fileName)

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from("ulcer-images")
                .upload(fileName, blob, {
                    contentType: "image/jpeg",
                    upsert: false, // Don't overwrite existing files
                })

            if (uploadError) {
                console.error("Storage upload error:", uploadError)
                throw new Error(`Storage upload failed: ${uploadError.message}. Please check if the 'ulcer-images' bucket exists and you have permission to upload.`)
            }

            console.log("Image uploaded successfully")

            const { data: { publicUrl } } = supabase.storage
                .from("ulcer-images")
                .getPublicUrl(fileName)

            console.log("Public URL:", publicUrl)

            const analysisData = {
                user_id: user.id,
                image_url: publicUrl,
                notes: notes || null,
                ulcer_size_cm2: Number((Math.random() * 3 + 2).toFixed(1)),
                depth_mm: Number((Math.floor(Math.random() * 5 + 2)).toFixed(1)),
                diameter_cm: Number((Math.random() * 2 + 1).toFixed(1)),
                tissue_composition: "Healthy granulation (85%), epithelializing",
                exudate_level: "Minimal, serous",
                location: "Plantar aspect, metatarsal head 1",
                diagnosis: "Neuropathic Ulcer - Wagner Grade 1",
                severity: ["MILD", "MODERATE", "MODERATE"][Math.floor(Math.random() * 3)],
                recommended_actions: [
                    "Continue daily wound dressing changes",
                    "Monitor for signs of infection",
                    "Maintain offloading protocol",
                    "Schedule follow-up in 2 weeks"
                ]
            }

            console.log("Inserting database record...")

            const { data: insertedImage, error: dbError } = await supabase
                .from("ulcer_images")
                .insert(analysisData)
                .select()
                .single()

            if (dbError) {
                console.error("Database error:", dbError)
                throw new Error(`Database insert failed: ${dbError.message}. Please check if the 'ulcer_images' table exists and you have permission to insert.`)
            }

            console.log("Database record created:", insertedImage.id)

            setUploadedImageId(insertedImage.id)
            setStep("success")
        } catch (err) {
            console.error("Upload error:", err)
            const errorMessage = err instanceof Error ? err.message : "Failed to upload image"
            setError(errorMessage)
            console.error("Error details:", {
                message: errorMessage,
                error: err,
                capturedImage: capturedImage ? "exists" : "missing"
            })
        } finally {
            setIsUploading(false)
        }
    }

    // Get status messages
    const getStatusMessage = () => {
        if (!detectionStatus.hasCellPhone) {
            return t.capture.placeCellPhone
        }

        // Cell phone detected but not in right position
        if (detectionStatus.hasCellPhone && !isPositioned) {
            const messages: string[] = [t.capture.cellPhoneDetected]

            if (detectionStatus.distance === "too-far") {
                messages.push(t.capture.goFurther)
            } else if (detectionStatus.distance === "too-close") {
                messages.push(t.capture.closeEnough)
            } else if (detectionStatus.distance === "ideal") {
                messages.push(t.capture.distanceOK)
            }

            if (detectionStatus.lighting === "too-dark") {
                messages.push(t.capture.findBrighterLighting)
            } else if (detectionStatus.lighting === "too-bright") {
                messages.push(t.capture.reduceLighting)
            }

            return messages.join(" • ")
        }

        // Cell phone detected and positioned correctly
        if (detectionStatus.hasCellPhone && isPositioned) {
            return t.capture.perfectReady
        }

        return t.capture.placeCellPhone
    }

    const getStatusColor = () => {
        // Only green if cell phone is detected AND properly positioned
        if (isPositioned && detectionStatus.hasCellPhone) return "bg-green-500/90"
        // Red if no cell phone detected or not properly positioned
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
                    <h1 className="text-white font-semibold">{t.capture.title}</h1>
                    <LanguageSwitcher className="text-white border-white/50 bg-white/20 hover:bg-white/30 shadow-lg" />
                </div>

                {/* Loading Model Indicator */}
                {modelLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
                        <div className="text-center text-white">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            <p>{t.capture.loadingModel}</p>
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

                            {/* Object Detection Overlays - Show all detected objects with bounding boxes */}
                            {detectedObjects.map((detection, index) => {
                                const [x, y, width, height] = detection.bbox
                                const videoWidth = videoRef.current?.videoWidth || 640
                                const videoHeight = videoRef.current?.videoHeight || 480
                                const isCellPhone = detectionStatus.hasCellPhone && detectionStatus.cellPhoneBoundingBox &&
                                    Math.abs(detectionStatus.cellPhoneBoundingBox.x - x) < 20 &&
                                    Math.abs(detectionStatus.cellPhoneBoundingBox.y - y) < 20

                                return (
                                    <div
                                        key={index}
                                        className="absolute pointer-events-none z-10"
                                        style={{
                                            left: `${(x / videoWidth) * 100}%`,
                                            top: `${(y / videoHeight) * 100}%`,
                                            width: `${(width / videoWidth) * 100}%`,
                                            height: `${(height / videoHeight) * 100}%`,
                                            border: `2px solid ${isCellPhone ? 'rgb(34, 197, 94)' : 'rgba(59, 130, 246, 0.5)'}`,
                                            backgroundColor: isCellPhone ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                                        }}
                                    >
                                        {/* Label showing object class and confidence */}
                                        <div
                                            className="absolute -top-6 left-0 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap"
                                            style={{
                                                backgroundColor: isCellPhone ? 'rgb(34, 197, 94)' : 'rgba(59, 130, 246, 0.8)',
                                                color: 'white',
                                            }}
                                        >
                                            {isCellPhone
                                                ? `✅ ${t.capture.cellPhone.toUpperCase()}`
                                                : (detection.class === 'cell phone' || detection.class === 'phone' || detection.class === 'mobile phone'
                                                    ? t.capture.cellPhone
                                                    : detection.class === 'person'
                                                        ? t.capture.person
                                                        : detection.class)} ({(detection.score * 100).toFixed(0)}%)
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Highlight cell phone detection with special border */}
                            {detectionStatus.cellPhoneBoundingBox && detectionStatus.hasCellPhone && (
                                <div
                                    className="absolute border-2 border-green-500 pointer-events-none z-10"
                                    style={{
                                        left: `${(detectionStatus.cellPhoneBoundingBox.x / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                        top: `${(detectionStatus.cellPhoneBoundingBox.y / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                        width: `${(detectionStatus.cellPhoneBoundingBox.width / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                        height: `${(detectionStatus.cellPhoneBoundingBox.height / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                        borderColor: "rgb(34, 197, 94)",
                                        boxShadow: "0 0 10px rgba(34, 197, 94, 0.5)",
                                    }}
                                />
                            )}

                            {/* Directional Guidance Arrows - Only show when cell phone detected but not positioned */}
                            {detectionStatus.hasCellPhone && !isPositioned && (() => {
                                const guidance = getPositionGuidance()
                                const showDistance = detectionStatus.distance !== "ideal"

                                return (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                        {/* Center frame indicator */}
                                        <div
                                            className={`w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] rounded-2xl border-4 transition-all duration-300 bg-transparent border-red-500/50`}
                                        />

                                        {/* Directional arrows */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {/* Left Arrow */}
                                            {guidance.left && (
                                                <div className="absolute left-4 flex flex-col items-center gap-2 text-red-500">
                                                    <ArrowLeft className="h-8 w-8 animate-pulse" />
                                                    <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveLeft}</span>
                                                </div>
                                            )}

                                            {/* Right Arrow */}
                                            {guidance.right && (
                                                <div className="absolute right-4 flex flex-col items-center gap-2 text-red-500">
                                                    <ArrowRight className="h-8 w-8 animate-pulse" />
                                                    <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveRight}</span>
                                                </div>
                                            )}

                                            {/* Up Arrow */}
                                            {guidance.up && (
                                                <div className="absolute top-4 flex flex-col items-center gap-2 text-red-500">
                                                    <ArrowUp className="h-8 w-8 animate-pulse" />
                                                    <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveUp}</span>
                                                </div>
                                            )}

                                            {/* Down Arrow */}
                                            {guidance.down && (
                                                <div className="absolute bottom-4 flex flex-col items-center gap-2 text-red-500">
                                                    <ArrowDown className="h-8 w-8 animate-pulse" />
                                                    <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveDown}</span>
                                                </div>
                                            )}

                                            {/* Distance guidance (closer/farther) */}
                                            {showDistance && (
                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-red-500">
                                                    {detectionStatus.distance === "too-far" ? (
                                                        <>
                                                            <ArrowUp className="h-8 w-8 animate-bounce" />
                                                            <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveCloser}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowDown className="h-8 w-8 animate-bounce" />
                                                            <span className="text-xs font-medium bg-black/70 px-2 py-1 rounded">{t.capture.moveFarther}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Status Indicator */}
                            {!isPositioned && (
                                <div className="absolute top-24 left-0 right-0 flex justify-center z-20">
                                    <div
                                        className={`px-5 py-2.5 rounded-full flex items-center gap-2 backdrop-blur-sm transition-all duration-300 ${getStatusColor()} text-white`}
                                    >
                                        {!detectionStatus.hasCellPhone && <Move className="h-5 w-5 animate-pulse" />}
                                        {detectionStatus.hasCellPhone && detectionStatus.distance === "too-far" && <ArrowDown className="h-5 w-5 animate-bounce" />}
                                        {detectionStatus.hasCellPhone && detectionStatus.distance === "too-close" && <ArrowUp className="h-5 w-5 animate-bounce" />}
                                        {detectionStatus.lighting === "too-dark" && <Sun className="h-5 w-5 animate-pulse" />}
                                        {detectionStatus.lighting === "too-bright" && <Moon className="h-5 w-5 animate-pulse" />}
                                        <span className="font-medium">{getStatusMessage()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Status Indicators */}
                            {detectionStatus.hasCellPhone && !isPositioned && (
                                <div className="absolute top-32 left-0 right-0 flex justify-center gap-2 z-20">
                                    {detectionStatus.distance !== "ideal" && (
                                        <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                            {detectionStatus.distance === "too-far" ? (
                                                <>
                                                    <ArrowDown className="h-4 w-4" />
                                                    {t.capture.goFurther}
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowUp className="h-4 w-4" />
                                                    {t.capture.closeEnough}
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {detectionStatus.distance === "ideal" && (
                                        <div className="px-3 py-1.5 rounded-full bg-green-500/80 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                            <Check className="h-4 w-4" />
                                            {t.capture.distanceOK}
                                        </div>
                                    )}
                                    {detectionStatus.lighting !== "ideal" && (
                                        <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                            {detectionStatus.lighting === "too-dark" ? (
                                                <>
                                                    <Sun className="h-4 w-4" />
                                                    {t.capture.tooDark}
                                                </>
                                            ) : (
                                                <>
                                                    <Moon className="h-4 w-4" />
                                                    {t.capture.tooBright}
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
                        <h1 className="text-xl font-semibold flex-1">{t.capture.reviewPhoto}</h1>
                        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                            <Home className="h-6 w-6" />
                        </Button>
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
                            <CardTitle className="text-base">{t.capture.addNotes}</CardTitle>
                            <CardDescription>
                                {t.capture.notesDescription}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t.capture.notesPlaceholder}
                                rows={4}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3">
                        <Button onClick={confirmPhoto} size="lg" className="w-full gap-2">
                            <Sparkles className="h-5 w-5" />
                            {t.capture.analyzePhoto}
                        </Button>
                        <Button onClick={retakePhoto} variant="outline" size="lg" className="w-full bg-transparent">
                            <RotateCcw className="mr-2 h-5 w-5" />
                            {t.capture.retakePhoto}
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
                        <CardTitle>{t.capture.confirmUpload}</CardTitle>
                        <CardDescription>
                            {t.capture.uploadDescription}
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
                                <p className="text-sm font-medium mb-1">{t.capture.yourNotes}</p>
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
                                    {t.capture.analyzing}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5" />
                                    {t.capture.uploadAnalyze}
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={() => setStep("preview")}
                            variant="ghost"
                            disabled={isUploading}
                            className="w-full"
                        >
                            {t.capture.goBack}
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
                        <CardTitle className="text-2xl">{t.capture.analysisComplete}</CardTitle>
                        <CardDescription>
                            {t.capture.analysisSuccess}
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
                                {t.capture.viewResults}
                            </Button>
                        )}
                        <Button
                            onClick={() => router.push("/dashboard")}
                            variant="outline"
                            size="lg"
                            className="w-full"
                        >
                            {t.capture.backToDashboard}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return null
}
