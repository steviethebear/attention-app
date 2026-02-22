import { QRCodeSVG } from 'qrcode.react';

export default function JoinCodeDisplay({ code, joinUrl }: { code: string; joinUrl: string }) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-2xl shadow-sm border-2 border-indigo-100 gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
                <h2 className="text-gray-500 font-semibold uppercase tracking-wider text-sm">Join at this URL</h2>
                <div className="text-lg text-indigo-900 break-all">{joinUrl}</div>
                <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                    <p className="text-gray-500 font-semibold uppercase tracking-wider text-sm mb-2">Class Code</p>
                    <div className="text-4xl font-mono font-bold tracking-widest text-indigo-600 bg-indigo-50 px-6 py-3 rounded-xl inline-block">
                        {code}
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
                <QRCodeSVG
                    value={joinUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="L"
                    includeMargin={false}
                />
            </div>
        </div>
    );
}
