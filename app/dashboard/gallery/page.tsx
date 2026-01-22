"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Camera, Calendar, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

interface UlcerImage {
  id: string;
  image_url: string;
  notes: string | null;
  created_at: string;
}

export default function GalleryPage() {
  const { t, language } = useLanguage();
  const [images, setImages] = useState<UlcerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UlcerImage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<UlcerImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchImages = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ulcer_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching images:", error);
      }

      // Generate signed URLs for images if needed (for private buckets)
      if (data) {
        const imagesWithUrls = await Promise.all(
          data.map(async (image) => {
            if (!image.image_url) return image;
            
            // Try to extract file path from URL (format: https://...supabase.co/storage/v1/object/public/ulcer-images/user_id/timestamp.jpg)
            // Or if it's already a path: user_id/timestamp.jpg
            let filePath = image.image_url;
            
            // Extract path from full public URL
            const urlMatch = image.image_url.match(/ulcer-images\/(.+)$/);
            if (urlMatch) {
              filePath = urlMatch[1];
            }
            
            // Try to create a signed URL (works for private buckets)
            try {
              const { data: signedData, error: signedError } = await supabase.storage
                .from("ulcer-images")
                .createSignedUrl(filePath, 3600); // 1 hour expiry
              
              if (!signedError && signedData?.signedUrl) {
                console.log("Using signed URL for:", filePath);
                return { ...image, image_url: signedData.signedUrl };
              }
            } catch (err) {
              console.warn("Could not create signed URL, using original:", err);
            }
            
            // Fallback to original URL (works if bucket is public)
            return image;
          })
        );
        setImages(imagesWithUrls);
      } else {
        setImages([]);
      }
      setIsLoading(false);
    };

    fetchImages();
  }, [supabase]);

  const formatDate = (dateString: string) => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, image: UlcerImage) => {
    e.stopPropagation(); // Prevent opening the detail dialog
    setImageToDelete(image);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract file path from image URL
      let filePath = imageToDelete.image_url;
      const urlMatch = imageToDelete.image_url.match(/ulcer-images\/(.+)$/);
      if (urlMatch) {
        filePath = urlMatch[1];
      }

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from("ulcer-images")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage delete error (may not exist):", storageError);
        // Continue with database delete even if storage delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("ulcer_images")
        .delete()
        .eq("id", imageToDelete.id)
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      // Remove from local state
      setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
      setImageToDelete(null);
      
      // Close detail dialog if the deleted image was selected
      if (selectedImage?.id === imageToDelete.id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert(t.gallery.deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto">
      <div className="pt-2">
        <h1 className="text-2xl font-semibold">{t.gallery.title}</h1>
        <p className="text-muted-foreground">
          {t.gallery.subtitle}
        </p>
      </div>

      {images.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t.gallery.noPhotos}</h3>
              <p className="text-sm text-muted-foreground">
                {t.gallery.noPhotosDescription}
              </p>
            </div>
            <Link href="/dashboard/capture">
              <Button>{t.gallery.takeFirstPhoto}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative group"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square relative">
                <img
                  src={image.image_url || "/placeholder.svg"}
                  alt={`Ulcer photo from ${formatDate(image.created_at)}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("Image load error:", image.image_url)
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
                {image.notes && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center z-10">
                    <FileText className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(e, image)}
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label={t.gallery.deletePhoto}
                  title={t.gallery.deletePhoto}
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <CardContent className="p-3">
                <p className="text-xs font-medium">
                  {formatDate(image.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(image.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Detail Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedImage && formatDate(selectedImage.created_at)}
            </DialogTitle>
            <DialogDescription>
              {selectedImage && formatTime(selectedImage.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="flex flex-col gap-4">
              <img
                src={selectedImage.image_url || "/placeholder.svg"}
                alt="Ulcer photo detail"
                className="w-full rounded-lg"
                onError={(e) => {
                  console.error("Image load error:", selectedImage.image_url)
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
              {selectedImage.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.gallery.notes}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.notes}
                  </p>
                </div>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  setImageToDelete(selectedImage);
                  setSelectedImage(null);
                }}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.gallery.deletePhoto}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!imageToDelete} onOpenChange={(open) => !open && !isDeleting && setImageToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.gallery.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.gallery.deleteConfirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setImageToDelete(null)}
              disabled={isDeleting}
            >
              {t.gallery.cancel}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.gallery.deleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
