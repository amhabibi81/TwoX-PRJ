import { useLoading } from '../contexts/LoadingContext';

export default function LoadingOverlay() {
  const { loading, loadingMessage } = useLoading();

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white p-8 rounded-lg flex flex-col items-center gap-5 shadow-xl">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        {loadingMessage ? (
          <div className="text-gray-900 text-base text-center">
            {loadingMessage}
          </div>
        ) : (
          <div className="text-gray-600 text-sm text-center">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
