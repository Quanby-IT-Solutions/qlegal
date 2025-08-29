"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/core/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { InputPassword } from "@/core/components/ui/input-password"

import { initiateLogin } from "@/features/auth/api/auth-login-action"
// import { trpc } from "@/services/trpc/client"

import { loginSchema, type LoginSchema } from "@/features/auth/api/auth.schemas"
import { LoginTwoFactor } from "@/features/auth/components/login-two-factor"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [pendingPassword, setPendingPassword] = useState("")

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (values: LoginSchema) => {
    setIsSubmitting(true)
    try {
      const result = await initiateLogin(values)
      if (result.requiresTwoFactor) {
        setUserEmail(values.email)
        setPendingPassword(values.password)
        setShowTwoFactor(true)
        toast.success(result.message)
      } else {
        console.log("DEBUG: Login result:", result)

        // Check if user has default signature BEFORE calling signIn
        console.log("DEBUG: hasDefaultSignature:", result.hasDefaultSignature)
        if (!result.hasDefaultSignature) {
          // First, establish the session
          const res = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
            callbackUrl: "/auth/signature" // Set signature page as the callback
          })
          console.log("DEBUG: NextAuth response:", res)

          if (res?.ok) {
            toast.success("Login successful")
            // Redirect to signature setup with original callback URL
            // Properly encode the callback URL to preserve all parameters
            const signatureUrl = `/auth/signature?callbackUrl=${encodeURIComponent(callbackUrl)}`
            console.log("DEBUG: Redirecting to signature:", signatureUrl)
            console.log("DEBUG: Original callbackUrl:", callbackUrl)
            // Use router.push instead of window.location for better Next.js integration
            router.push(signatureUrl)
          } else {
            toast.error("Authentication failed")
          }
        } else {
          // User has signature, proceed with normal login
          const res = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
            callbackUrl
          })
          console.log("DEBUG: NextAuth response:", res)

          if (res?.ok) {
            toast.success("Login successful")
            // Normal redirect to dashboard or callback
            console.log("DEBUG: Redirecting to callback:", callbackUrl)
            router.push(callbackUrl)
          } else {
            toast.error("Authentication failed")
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTwoFactorSuccess = async (
    verificationToken: string,
    hasDefaultSignature: boolean
  ) => {
    const res = await signIn("credentials", {
      email: userEmail,
      verificationToken,
      redirect: false,
      callbackUrl
    })
    if (res?.ok) {
      toast.success("Login successful")
      // Check if user has default signature
      if (!hasDefaultSignature) {
        // Redirect to signature setup with callback URL
        const signatureUrl = `/auth/signature?callbackUrl=${encodeURIComponent(callbackUrl)}`
        console.log("DEBUG: Two-factor - redirecting to signature:", signatureUrl)
        console.log("DEBUG: Two-factor - original callbackUrl:", callbackUrl)
        router.push(signatureUrl)
      } else {
        // Normal redirect to dashboard or callback
        router.push(callbackUrl)
      }
    } else {
      toast.error("Failed to establish session")
    }
  }

  const handleBackToLogin = () => {
    setShowTwoFactor(false)
    setUserEmail("")
    setPendingPassword("")
    form.reset()
  }

  if (showTwoFactor) {
    return (
      <LoginTwoFactor
        email={userEmail}
        password={pendingPassword}
        onBack={handleBackToLogin}
        onSuccess={handleTwoFactorSuccess}
      />
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <QuanbyLogo className="h-16 w-16" />
        </div>
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your Quanby Sign account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <InputPassword
                      placeholder="Enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:text-primary/80 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-primary hover:text-primary/80 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
