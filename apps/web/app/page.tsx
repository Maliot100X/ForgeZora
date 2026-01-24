
import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">Forgecast Mini App – Phase 1</h1>
        <div className="p-4 border border-slate-700 rounded bg-slate-800">
          <p>Foundation Setup Complete.</p>
          <p className="text-slate-400 mt-2">Ready for Farcaster Context.</p>
        </div>
      </div>
    </main>
  );
}
