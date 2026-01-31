'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { RegisterRequest } from '@creatormatch/shared-types';

type FormData = Omit<RegisterRequest, 'role'> & { confirmPassword: string };

export default function RegisterBusinessPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const password = watch('password');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        role: 'business',
        firstName: data.firstName,
        lastName: data.lastName,
      });
      toast.success('Account created! Start your 14-day free trial.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <Card className="py-8 px-4 sm:px-10">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Register Your Business
        </h2>
        <p className="text-sm text-gray-600 text-center mb-8">
          Find local creators to promote your business
        </p>

        <div className="mb-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-800">
            <strong>14-day free trial</strong> - No credit card required. Then $49/month.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              {...register('firstName', { required: 'First name is required' })}
              error={errors.firstName?.message}
            />
            <Input
              label="Last name"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>

          <Input
            label="Business email"
            type="email"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must contain uppercase, lowercase, and number',
              },
            })}
            error={errors.password?.message}
          />

          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === password || 'Passwords do not match',
            })}
            error={errors.confirmPassword?.message}
          />

          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Start Free Trial
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-500 font-medium">
            Sign in
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-gray-600">
          Are you a content creator?{' '}
          <Link href="/register/creator" className="text-primary-600 hover:text-primary-500 font-medium">
            Register as a Creator
          </Link>
        </p>
      </Card>
    </div>
  );
}
