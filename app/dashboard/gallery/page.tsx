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
} from "@/components/ui/dialog";
import { Loader2, Camera, Calendar, FileText } from "lucide-react";
import Link from "next/link";

interface UlcerImage {
  id: string;
  image_url: string;
  notes: string | null;
  created_at: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<UlcerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UlcerImage | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchImages = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("ulcer_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setImages(data || []);
      setIsLoading(false);
    };

    fetchImages();
  }, [supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
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
        <h1 className="text-2xl font-semibold">Photo History</h1>
        <p className="text-muted-foreground">
          View all your documented photos
        </p>
      </div>

      {images.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">No photos yet</h3>
              <p className="text-sm text-muted-foreground">
                Start documenting your ulcer to track healing progress
              </p>
            </div>
            <Link href="/dashboard/capture">
              <Button>Take First Photo</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square relative">
                <img
                  src={image.image_url || "/placeholder.svg"}
                  alt={`Ulcer photo from ${formatDate(image.created_at)}`}
                  className="w-full h-full object-cover"
                />
                {image.notes && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <FileText className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
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
              />
              {selectedImage.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
