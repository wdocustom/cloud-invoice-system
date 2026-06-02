"use client";
import { useRouter } from "next/navigation";

export default function RootLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans antialiased selection:bg-blue-500/20 text-left">
      
      {/* Premium Ambient Background Graphics Art */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-indigo-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      {/* World-Class Core Hub Panel Container */}
      <div className="relative z-10 max-w-xl w-full px-6 text-center space-y-8 animate-fadeIn">
        
        {/* Branding Token Accent Badge */}
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 shadow-xl mx-auto">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">WDO Custom Enterprise Framework</span>
        </div>

        {/* High-Impact Copy Layout */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white tracking-tight uppercase sm:text-5xl">
            Cloud Invoice <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400">
              System Interface
            </span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mx-auto">
            High-fidelity construction estimating engines, native phone photo sync sub-ledgers, and automated nested Gantt timeline charts channels.
          </p>
        </div>

        {/* Glassmorphic Navigation Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md max-w-sm w-full mx-auto">
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-xs py-3.5 px-6 rounded-xl tracking-widest uppercase transition-all shadow-lg shadow-blue-600/10 outline-none flex items-center justify-center gap-2"
          >
            📊 Estimator Workspace Dashboard →
          </button>
        </div>

        {/* Micro System Metadata Status Label */}
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Node Security TLS Secured • Vercel Edge Deployed
        </p>
      </div>

    </div>
  );
}