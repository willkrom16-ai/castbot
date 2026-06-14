import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">CastBot</h1>
          <p className="text-muted-foreground text-sm">
            Your AI-assisted casting decision system
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
