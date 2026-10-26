import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Navigation / Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💸</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            MoneyMap
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Sign In
          </Link>
          <Link 
            href="/auth/sign-up" 
            className="text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center mt-12 md:mt-24">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Master Your Finances with <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Confidence</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            MoneyMap intelligently splits your salary into Needs, Wants, and Savings. Track your daily expenses and build a secure financial future effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link 
              href="/auth/sign-up" 
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Get Started Now
            </Link>
            <Link 
              href="/auth/login" 
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full pb-20">
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6">📊</div>
            <h3 className="text-xl font-bold mb-3">Smart Allocation</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Automatically divide your monthly income into essential needs, personal wants, and future savings using proven financial rules.
            </p>
          </div>
          
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6">🛒</div>
            <h3 className="text-xl font-bold mb-3">Expense Tracking</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Log your daily spending in seconds. See exactly where your money goes with detailed category breakdowns.
            </p>
          </div>
          
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6">💰</div>
            <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Your financial data is protected with enterprise-grade encryption and strict Row Level Security.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
