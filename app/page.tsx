import Link from 'next/link';

export default function LandingPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <h1 className="text-4xl font-black tracking-tight text-indigo-900 mb-2">Attention</h1>
                    <p className="text-gray-500 text-lg">A real-time classroom activity</p>
                </div>

                <div className="space-y-4 pt-4">
                    <Link
                        href="/join"
                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        I'm a Student
                    </Link>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-400">or</span>
                        </div>
                    </div>

                    <Link
                        href="/teacher/create"
                        className="w-full flex justify-center py-4 px-4 border-2 border-indigo-100 text-indigo-600 rounded-xl shadow-sm text-lg font-bold bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        I'm a Teacher
                    </Link>
                </div>
            </div>
        </main>
    );
}
