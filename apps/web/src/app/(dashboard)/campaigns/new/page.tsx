'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Card, Button, Input, Badge } from '@/components/ui';
import { formatNiche } from '@creatormatch/shared-utils';
import { NicheCategory, ContentType } from '@creatormatch/shared-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const STEPS = ['Basic Info', 'Target Creators', 'Budget & Timeline', 'Review'];

const NICHES: NicheCategory[] = [
  'food', 'fashion', 'beauty', 'fitness', 'travel', 'lifestyle',
  'tech', 'gaming', 'parenting', 'pets', 'home_decor', 'other'
];

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'instagram_post', label: 'Instagram Post' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'instagram_reel', label: 'Instagram Reel' },
  { value: 'tiktok_video', label: 'TikTok Video' },
];

type FormData = {
  title: string;
  description: string;
  objective: string;
  contentTypes: ContentType[];
  niches: NicheCategory[];
  minFollowers: number;
  maxFollowers: number;
  minEngagement: number;
  radiusMiles: number;
  budgetCents: number;
  maxCreators: number;
  startDate: string;
  endDate: string;
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      contentTypes: [],
      niches: [],
      minFollowers: 1000,
      maxFollowers: 50000,
      minEngagement: 2,
      radiusMiles: 25,
      maxCreators: 5,
    },
  });

  const selectedNiches = watch('niches') || [];
  const selectedContentTypes = watch('contentTypes') || [];

  const toggleNiche = (niche: NicheCategory) => {
    const current = selectedNiches;
    const updated = current.includes(niche)
      ? current.filter((n) => n !== niche)
      : [...current, niche];
    setValue('niches', updated);
  };

  const toggleContentType = (type: ContentType) => {
    const current = selectedContentTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setValue('contentTypes', updated);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // In real app, call API to create campaign
      console.log('Creating campaign:', data);
      toast.success('Campaign created successfully!');
      router.push('/campaigns');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-600 mt-1">Set up a new influencer marketing campaign</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className={`ml-2 text-sm ${i <= step ? 'text-gray-900' : 'text-gray-500'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-6">
          <div className="p-6">
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

                <Input
                  label="Campaign Title"
                  placeholder="e.g., Summer Food Festival Promo"
                  {...register('title', { required: 'Title is required' })}
                  error={errors.title?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Describe your campaign and what you're looking for..."
                    {...register('description')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Types Required
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleContentType(type.value)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedContentTypes.includes(type.value)
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Target Creators</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Target Niches
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((niche) => (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => toggleNiche(niche)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedNiches.includes(niche)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {formatNiche(niche)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Min Followers"
                    type="number"
                    {...register('minFollowers', { valueAsNumber: true })}
                  />
                  <Input
                    label="Max Followers"
                    type="number"
                    {...register('maxFollowers', { valueAsNumber: true })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Min Engagement Rate (%)"
                    type="number"
                    step="0.1"
                    {...register('minEngagement', { valueAsNumber: true })}
                  />
                  <Input
                    label="Search Radius (miles)"
                    type="number"
                    {...register('radiusMiles', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Budget & Timeline</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Total Budget ($)"
                    type="number"
                    placeholder="500"
                    {...register('budgetCents', {
                      valueAsNumber: true,
                      setValueAs: (v) => v * 100,
                    })}
                  />
                  <Input
                    label="Max Creators"
                    type="number"
                    {...register('maxCreators', { valueAsNumber: true })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    {...register('startDate')}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    {...register('endDate')}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Review Campaign</h2>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Title</span>
                    <p className="font-medium">{watch('title') || 'Not set'}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Target Niches</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedNiches.length > 0 ? (
                        selectedNiches.map((niche) => (
                          <Badge key={niche}>{formatNiche(niche)}</Badge>
                        ))
                      ) : (
                        <span className="text-gray-400">None selected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Follower Range</span>
                    <p className="font-medium">
                      {watch('minFollowers')?.toLocaleString()} - {watch('maxFollowers')?.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Budget</span>
                    <p className="font-medium">${(watch('budgetCents') / 100) || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 0}
            leftIcon={<ChevronLeftIcon className="h-5 w-5" />}
          >
            Previous
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              rightIcon={<ChevronRightIcon className="h-5 w-5" />}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" loading={isLoading}>
              Create Campaign
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
