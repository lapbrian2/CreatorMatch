import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold text-primary-600">CreatorMatch</span>
          <span className="text-2xl font-light text-gray-600 ml-1">Local</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
