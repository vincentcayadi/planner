'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlannerStore } from '@/stores/plannerStore';
import { INTERVAL_OPTIONS } from '@/lib/constants/intervals';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OnboardingStep = 'welcome' | 'preferences' | 'complete';

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { globalConfig, updateGlobalConfig, updateUserPreferences } = usePlannerStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: globalConfig.startTime,
    endTime: globalConfig.endTime,
    interval: globalConfig.interval,
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('preferences');
    } else if (currentStep === 'preferences') {
      setCurrentStep('complete');
    }
  };

  const handleBack = () => {
    if (currentStep === 'preferences') {
      setCurrentStep('welcome');
    } else if (currentStep === 'complete') {
      setCurrentStep('preferences');
    }
  };

  const handleSkipStep = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('preferences');
    } else if (currentStep === 'preferences') {
      handleComplete(true);
    }
  };

  const handleSkipAll = () => {
    handleComplete(true);
  };

  const handleComplete = (isSkipped = false) => {
    // Save preferences even if skipped (use defaults)
    const finalData = isSkipped ? {
      name: '',
      startTime: globalConfig.startTime,
      endTime: globalConfig.endTime,
      interval: globalConfig.interval,
    } : formData;

    // Update global config with new defaults
    updateGlobalConfig({
      startTime: finalData.startTime,
      endTime: finalData.endTime,
      interval: finalData.interval,
    });

    // Update user preferences
    updateUserPreferences({
      name: finalData.name || undefined,
      hasCompletedOnboarding: true,
    });

    // Close dialog
    onOpenChange(false);

    // Show success message
    if (!isSkipped) {
      toast.success('Welcome! Your preferences have been saved.');
    }
  };

  const renderWelcomeStep = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Welcome to Planner!</h2>
        <p className="text-sm text-neutral-600">
          Let's set up your account to personalize your experience.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Your Name (Optional)
          </Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-neutral-500 mt-1">
            This will appear on shared schedules
          </p>
        </div>
      </div>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Schedule Preferences</h2>
        <p className="text-sm text-neutral-600">
          Set your default schedule settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start-time" className="text-sm font-medium">
              Default Start Time
            </Label>
            <Input
              id="start-time"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end-time" className="text-sm font-medium">
              Default End Time
            </Label>
            <Input
              id="end-time"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="interval" className="text-sm font-medium">
            Time Interval
          </Label>
          <Select
            value={String(formData.interval)}
            onValueChange={(value) => handleInputChange('interval', Number(value))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">You're All Set! 🎉</h2>
        <p className="text-sm text-neutral-600">
          Your preferences have been saved. You can change these anytime in settings.
        </p>
      </div>

      <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
        <h3 className="text-sm font-medium">Your Settings:</h3>
        <div className="text-xs text-neutral-600 space-y-1">
          {formData.name && <div>Name: {formData.name}</div>}
          <div>Schedule: {formData.startTime} - {formData.endTime}</div>
          <div>Interval: {INTERVAL_OPTIONS.find(opt => opt.value === String(formData.interval))?.label}</div>
        </div>
      </div>
    </div>
  );

  const isLastStep = currentStep === 'complete';
  const isFirstStep = currentStep === 'welcome';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Getting Started ({currentStep === 'welcome' ? '1' : currentStep === 'preferences' ? '2' : '3'}/3)
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'welcome' && 'Tell us about yourself'}
            {currentStep === 'preferences' && 'Configure your default schedule'}
            {currentStep === 'complete' && 'Setup complete!'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 'welcome' && renderWelcomeStep()}
          {currentStep === 'preferences' && renderPreferencesStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handleBack} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastStep && (
              <>
                <Button variant="ghost" onClick={handleSkipStep} size="sm">
                  Skip
                </Button>
                <Button variant="ghost" onClick={handleSkipAll} size="sm">
                  Skip All
                </Button>
              </>
            )}

            {isLastStep ? (
              <Button onClick={() => handleComplete()} size="sm">
                Get Started
              </Button>
            ) : (
              <Button onClick={handleNext} size="sm">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}