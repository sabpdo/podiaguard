"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Heart,
  Droplets,
  Footprints,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface WoundExample {
  id: string;
  title: string;
  description: string;
  status: "good" | "bad" | "warning";
  imageDescription: string;
  tips: string[];
}

// Function to get translated examples
function getGoodExamples(t: any): WoundExample[] {
  return [
    {
      id: "good-1",
      title: t.education.goodExample1Title,
      description: t.education.goodExample1Description,
      status: "good",
      imageDescription: t.education.goodExample1ImageDesc,
      tips: t.education.goodExample1Tips,
    },
    {
      id: "good-2",
      title: t.education.goodExample2Title,
      description: t.education.goodExample2Description,
      status: "good",
      imageDescription: t.education.goodExample2ImageDesc,
      tips: t.education.goodExample2Tips,
    },
    {
      id: "good-3",
      title: t.education.goodExample3Title,
      description: t.education.goodExample3Description,
      status: "good",
      imageDescription: t.education.goodExample3ImageDesc,
      tips: t.education.goodExample3Tips,
    },
  ];
}

function getBadExamples(t: any): WoundExample[] {
  return [
    {
      id: "bad-1",
      title: t.education.badExample1Title,
      description: t.education.badExample1Description,
      status: "bad",
      imageDescription: t.education.badExample1ImageDesc,
      tips: t.education.badExample1Tips,
    },
    {
      id: "bad-2",
      title: t.education.badExample2Title,
      description: t.education.badExample2Description,
      status: "bad",
      imageDescription: t.education.badExample2ImageDesc,
      tips: t.education.badExample2Tips,
    },
    {
      id: "bad-3",
      title: t.education.badExample3Title,
      description: t.education.badExample3Description,
      status: "bad",
      imageDescription: t.education.badExample3ImageDesc,
      tips: t.education.badExample3Tips,
    },
  ];
}

const educationTopics = [
  {
    id: "daily-care",
    icon: Droplets,
    title: "Daily Wound Care",
    description: "Essential steps for cleaning and dressing your wound",
    content: [
      "Wash your hands thoroughly before and after wound care",
      "Clean the wound gently with saline or prescribed solution",
      "Pat dry with clean gauze - don't rub",
      "Apply prescribed medications or ointments",
      "Cover with appropriate dressing as directed",
      "Change dressings as recommended by your healthcare provider",
    ],
  },
  {
    id: "foot-protection",
    icon: Footprints,
    title: "Protecting Your Feet",
    description: "Prevent additional injuries and promote healing",
    content: [
      "Wear properly fitted, protective footwear at all times",
      "Use off-loading devices as prescribed",
      "Check your feet daily for new wounds or changes",
      "Keep feet clean and moisturized (but not between toes)",
      "Never walk barefoot, even indoors",
      "Trim toenails carefully or have a professional do it",
    ],
  },
  {
    id: "warning-signs",
    icon: AlertTriangle,
    title: "Warning Signs",
    description: "When to contact your healthcare provider",
    content: [
      "Increased pain, swelling, or redness around the wound",
      "Fever or chills",
      "Foul smell coming from the wound",
      "Increased or colored discharge (yellow, green)",
      "Wound size increasing instead of decreasing",
      "New numbness or tingling in the foot",
    ],
  },
  {
    id: "nutrition",
    icon: Heart,
    title: "Nutrition for Healing",
    description: "Support your body's healing process",
    content: [
      "Eat adequate protein for tissue repair",
      "Include vitamin C rich foods (citrus, peppers, berries)",
      "Get enough zinc (nuts, seeds, whole grains)",
      "Stay well hydrated with water",
      "Manage blood sugar levels if diabetic",
      "Consider supplements as recommended by your doctor",
    ],
  },
];

export default function EducationPage() {
  const { t } = useLanguage();
  const [selectedExample, setSelectedExample] = useState<WoundExample | null>(
    null
  );
  const [selectedTopic, setSelectedTopic] = useState<
    (typeof educationTopics)[0] | null
  >(null);

  const goodExamples = getGoodExamples(t);
  const badExamples = getBadExamples(t);

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pb-8">
      <div className="pt-2">
        <h1 className="text-2xl font-semibold">{t.education.title}</h1>
        <p className="text-muted-foreground">
          {t.education.subtitle}
        </p>
      </div>

      {/* Quick Tips Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t.education.dailyReminder}</p>
            <p className="text-sm text-muted-foreground">
              {t.education.dailyReminderText}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wound Examples Tabs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t.education.woundAssessmentGuide}</h2>
        <Tabs defaultValue="good" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="good" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t.education.goodSigns}
            </TabsTrigger>
            <TabsTrigger value="bad" className="gap-2">
              <XCircle className="h-4 w-4" />
              {t.education.warningSigns}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="good" className="mt-4">
            <div className="flex flex-col gap-3">
              {goodExamples.map((example) => (
                <Card
                  key={example.id}
                  className="cursor-pointer hover:border-green-500/50 transition-colors"
                  onClick={() => setSelectedExample(example)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {example.title}
                        </CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {example.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="bad" className="mt-4">
            <div className="flex flex-col gap-3">
              {badExamples.map((example) => (
                <Card
                  key={example.id}
                  className="cursor-pointer hover:border-red-500/50 transition-colors"
                  onClick={() => setSelectedExample(example)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {example.title}
                        </CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {example.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Education Topics */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t.education.careTopics}</h2>
        <div className="grid grid-cols-2 gap-3">
          {educationTopics.map((topic) => (
            <Card
              key={topic.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedTopic(topic)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <topic.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm">{topic.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Example Detail Dialog */}
      <Dialog
        open={!!selectedExample}
        onOpenChange={() => setSelectedExample(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedExample?.status === "good" ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  {t.education.goodSign}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {t.education.warningSign}
                </Badge>
              )}
            </div>
            <DialogTitle>{selectedExample?.title}</DialogTitle>
            <DialogDescription>{selectedExample?.description}</DialogDescription>
          </DialogHeader>
          {selectedExample && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">{t.education.whatToLookFor}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedExample.imageDescription}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t.education.recommendedActions}</p>
                <ul className="space-y-2">
                  {selectedExample.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Topic Detail Dialog */}
      <Dialog
        open={!!selectedTopic}
        onOpenChange={() => setSelectedTopic(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedTopic && (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <selectedTopic.icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <DialogTitle>{selectedTopic?.title}</DialogTitle>
                <DialogDescription>
                  {selectedTopic?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedTopic && (
            <div className="flex flex-col gap-2">
              {selectedTopic.content.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
