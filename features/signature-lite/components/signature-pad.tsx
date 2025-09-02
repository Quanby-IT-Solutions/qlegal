"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"
import { PenTool, RotateCcw, Type, Upload, User } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/core/components/ui/tabs"

import { useUserDefaultSignature } from "../hooks/useUserDefaultSignature"

export interface SignaturePadRef {
  clear: () => void
  isEmpty: () => boolean
  getSignatureData: () => string | null
  getSignatureText: () => string
  getSignatureType: () => "drawn" | "typed" | "uploaded" | "default" | null
}

interface SignaturePadProps {
  onSignatureChange?: (hasSignature: boolean) => void
  userDefaultSignature?: string | null
  className?: string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange, userDefaultSignature, className }, ref) => {
    // Use custom hook to get default signature from database
    const { defaultSignature, isLoading: isLoadingDefaultSignature } =
      useUserDefaultSignature()

    // Use the most reliable source: database query > prop
    // Memoize this to prevent unnecessary re-calculations
    const finalDefaultSignature = useMemo(
      () => defaultSignature ?? userDefaultSignature,
      [defaultSignature, userDefaultSignature]
    )

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [signatureText, setSignatureText] = useState("")
    const [uploadedImage, setUploadedImage] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<
      "draw" | "type" | "upload" | "default"
    >(finalDefaultSignature ? "default" : "draw") // Start with default tab if available
    // Track if user clicked "Use Default" in draw tab
    const [useDefaultInDraw, setUseDefaultInDraw] = useState(false)
    // Track if user clicked "Use Default" in default tab
    const [useDefaultInDefaultTab, setUseDefaultInDefaultTab] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          clearCanvas()
          setSignatureText("")
          setUploadedImage(null)
          setUseDefaultInDraw(false)
          setUseDefaultInDefaultTab(false)
          setHasSignature(false)
          if (onSignatureChangeRef.current) {
            onSignatureChangeRef.current(false)
          }
        },
        isEmpty: () => !hasSignature,
        getSignatureData: () => {
          console.log("🔍 getSignatureData called:", {
            activeTab,
            useDefaultInDraw,
            useDefaultInDefaultTab,
            finalDefaultSignature: !!finalDefaultSignature,
            hasCanvas: !!canvasRef.current
          })

          if (activeTab === "draw") {
            if (useDefaultInDraw && finalDefaultSignature) {
              console.log("🔍 Returning default signature from draw tab")
              return finalDefaultSignature
            }
            const canvasData = canvasRef.current?.toDataURL() ?? null
            console.log("🔍 Returning canvas data:", !!canvasData)
            return canvasData
          } else if (activeTab === "upload") {
            console.log("🔍 Returning uploaded image:", !!uploadedImage)
            return uploadedImage
          } else if (activeTab === "default") {
            // Only return default signature if user explicitly clicked "Use Default"
            if (useDefaultInDefaultTab && finalDefaultSignature) {
              console.log("🔍 Returning default signature from default tab")
              return finalDefaultSignature
            }
            console.log("🔍 No default signature activated")
            return null
          }
          console.log("🔍 No signature data available")
          return null
        },
        getSignatureText: () => signatureText,
        getSignatureType: () => {
          console.log("🔍 getSignatureType called:", {
            activeTab,
            useDefaultInDraw,
            useDefaultInDefaultTab,
            finalDefaultSignature: !!finalDefaultSignature,
            signatureTextLength: signatureText.trim().length,
            hasUploadedImage: !!uploadedImage
          })

          if (activeTab === "draw") {
            if (useDefaultInDraw) {
              console.log("🔍 Returning 'default' from draw tab")
              return "default"
            }
            // Check if canvas has drawing
            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext("2d")
              if (ctx) {
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                )
                for (let i = 0; i < imageData.data.length; i += 4) {
                  const alpha = imageData.data[i + 3] ?? 0
                  if (alpha > 0) {
                    console.log("🔍 Returning 'drawn' from canvas")
                    return "drawn"
                  }
                }
              }
            }
          }
          if (activeTab === "type" && signatureText.trim().length > 0) {
            console.log("🔍 Returning 'typed' from text")
            return "typed"
          }
          if (activeTab === "upload" && uploadedImage !== null) {
            console.log("🔍 Returning 'uploaded' from upload")
            return "uploaded"
          }
          if (activeTab === "default") {
            // Return "default" if user explicitly activated it AND we have a default signature
            if (useDefaultInDefaultTab && finalDefaultSignature) {
              console.log("🔍 Returning 'default' from default tab")
              return "default"
            }
          }
          console.log("🔍 Returning null - no valid signature type")
          return null
        }
      }),
      [
        hasSignature,
        activeTab,
        uploadedImage,
        finalDefaultSignature,
        signatureText,
        useDefaultInDraw,
        useDefaultInDefaultTab
      ]
    )

    const clearCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = "source-over"
    }

    const getCanvasCoordinates = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      let clientX: number, clientY: number

      if ("touches" in e) {
        // Touch event
        const touch = e.touches[0] ?? e.changedTouches[0]
        if (!touch) return { x: 0, y: 0 }
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        // Mouse event
        clientX = e.clientX
        clientY = e.clientY
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      }
    }

    const startDrawing = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault()
      setIsDrawing(true)
      setUseDefaultInDraw(false) // Reset when user starts drawing

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const { x, y } = getCanvasCoordinates(e)

      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = "#000"
      ctx.globalCompositeOperation = "source-over"

      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const stopDrawing = () => {
      if (isDrawing) {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (ctx) {
          ctx.stroke()
        }
      }
      setIsDrawing(false)
      checkHasSignature()
    }

    const draw = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const { x, y } = getCanvasCoordinates(e)

      ctx.lineTo(x, y)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const checkHasSignature = useCallback(() => {
      console.log("checkHasSignature called - current states:", {
        activeTab,
        useDefaultInDefaultTab,
        finalDefaultSignature: !!finalDefaultSignature
      })

      let hasData = false

      if (activeTab === "draw") {
        if (useDefaultInDraw && finalDefaultSignature) {
          hasData = true
        } else {
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext("2d")
            if (ctx) {
              const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              )
              for (let i = 0; i < imageData.data.length; i += 4) {
                const alpha = imageData.data[i + 3] ?? 0
                if (alpha > 0) {
                  hasData = true
                  break
                }
              }
            }
          }
        }
      } else if (activeTab === "type") {
        hasData = signatureText.trim().length > 0
      } else if (activeTab === "upload") {
        hasData = uploadedImage !== null
      } else if (activeTab === "default") {
        // Only has signature if user explicitly clicked "Use Default"
        hasData =
          useDefaultInDefaultTab &&
          finalDefaultSignature !== null &&
          finalDefaultSignature !== ""

        console.log("checkHasSignature - default tab validation:", {
          activeTab,
          useDefaultInDefaultTab,
          finalDefaultSignature: !!finalDefaultSignature,
          hasData
        })
      }

      console.log("checkHasSignature final result:", {
        activeTab,
        hasData,
        useDefaultInDraw,
        useDefaultInDefaultTab
      })

      setHasSignature(hasData)
      if (onSignatureChangeRef.current) {
        console.log("Calling onSignatureChangeRef with:", hasData)
        onSignatureChangeRef.current(hasData)
      }
    }, [
      activeTab,
      signatureText,
      uploadedImage,
      finalDefaultSignature,
      useDefaultInDraw,
      useDefaultInDefaultTab
    ])

    // Stable reference to onSignatureChange to avoid infinite loops
    const onSignatureChangeRef = useRef(onSignatureChange)
    useEffect(() => {
      onSignatureChangeRef.current = onSignatureChange
    }, [onSignatureChange])

    // Ensure validation runs when default signature states change
    useEffect(() => {
      if (activeTab === "default" && useDefaultInDefaultTab) {
        console.log(
          "useEffect: Default signature activated, running validation"
        )
        checkHasSignature()
      }
    }, [useDefaultInDefaultTab, activeTab, checkHasSignature])

    const handleTextChange = useCallback((value: string) => {
      setSignatureText(value)
      const hasData = value.trim().length > 0
      setHasSignature(hasData)
      if (onSignatureChangeRef.current) {
        onSignatureChangeRef.current(hasData)
      }
    }, [])

    const scaleImageToFit = (
      imageDataUrl: string,
      maxHeight = 200,
      maxWidth = 800
    ): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(imageDataUrl)
            return
          }

          const originalWidth = img.width
          const originalHeight = img.height
          const aspectRatio = originalWidth / originalHeight

          let newHeight = maxHeight
          let newWidth = newHeight * aspectRatio

          if (newWidth > maxWidth) {
            newWidth = maxWidth
            newHeight = newWidth / aspectRatio
          }

          canvas.width = newWidth
          canvas.height = newHeight

          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          const scaledDataUrl = canvas.toDataURL("image/png", 1.0)
          resolve(scaledDataUrl)
        }
        img.onerror = () => {
          resolve(imageDataUrl)
        }
        img.src = imageDataUrl
      })
    }

    const handleFileUpload = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
          alert("Please select an image file")
          return
        }

        const reader = new FileReader()
        reader.onload = async (event) => {
          const result = event.target?.result as string

          try {
            const scaledImage = await scaleImageToFit(result, 200, 800)
            setUploadedImage(scaledImage)
            setHasSignature(true)
            if (onSignatureChangeRef.current) {
              onSignatureChangeRef.current(true)
            }
          } catch {
            setUploadedImage(result)
            setHasSignature(true)
            if (onSignatureChangeRef.current) {
              onSignatureChangeRef.current(true)
            }
          }
        }
        reader.readAsDataURL(file)
      },
      []
    )

    const handleTabChange = useCallback(
      (tab: string) => {
        const newTab = tab as "draw" | "type" | "upload" | "default"
        setActiveTab(newTab)
        setUseDefaultInDraw(false) // Reset when switching tabs
        setUseDefaultInDefaultTab(false) // Reset when switching tabs
        setTimeout(() => checkHasSignature(), 0)
      },
      [checkHasSignature]
    )

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = 500
      canvas.height = 200

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.globalCompositeOperation = "source-over"
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }, [])

    return (
      <div className={className}>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="default" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Default
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <Label className="mb-2 block text-sm font-medium text-card-foreground">
                Draw your signature below
              </Label>
              <div className="overflow-hidden rounded-lg border bg-background">
                <canvas
                  ref={canvasRef}
                  className="block w-full cursor-crosshair bg-background dark:bg-gray-100"
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  style={{
                    maxWidth: "100%",
                    height: "200px",
                    touchAction: "none"
                  }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                {finalDefaultSignature && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearCanvas()
                      setUseDefaultInDraw(true)
                      setHasSignature(true)
                      if (onSignatureChangeRef.current) {
                        onSignatureChangeRef.current(true)
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    Use Default
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearCanvas()
                    setUseDefaultInDraw(false)
                    setHasSignature(false)
                    if (onSignatureChangeRef.current) {
                      onSignatureChangeRef.current(false)
                    }
                  }}
                  className="ml-auto flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <Label
                htmlFor="signature-text"
                className="mb-2 block text-sm font-medium text-card-foreground"
              >
                Type your signature
              </Label>
              <Input
                id="signature-text"
                value={signatureText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Type your full name"
                className="font-serif text-lg"
              />
              {signatureText && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                  <Label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Preview:
                  </Label>
                  <p className="py-4 text-center font-serif text-2xl font-semibold text-foreground">
                    {signatureText}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <Label
                htmlFor="signature-upload"
                className="mb-2 block text-sm font-medium text-card-foreground"
              >
                Upload signature image
              </Label>
              <div className="space-y-4">
                <Input
                  ref={fileInputRef}
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PNG, JPG, GIF. Images will be scaled
                  automatically.
                </p>
              </div>
              {uploadedImage && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <Label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Preview (scaled to signature area):
                  </Label>
                  <div className="flex justify-center">
                    <div
                      className="rounded border bg-background p-2 shadow-sm dark:bg-gray-100"
                      style={{ maxHeight: "200px" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadedImage}
                        alt="Uploaded signature"
                        className="max-h-[180px] max-w-full rounded object-contain"
                        style={{ height: "auto", width: "auto" }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Image scaled to fit signature area
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="default" className="space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              {finalDefaultSignature ? (
                <>
                  <Label className="mb-2 block text-sm font-medium text-card-foreground">
                    Your default signature
                  </Label>
                  <div
                    className={`rounded-lg border p-4 ${useDefaultInDefaultTab
                      ? "border-green-200 bg-green-50"
                      : "border-muted bg-muted/30"
                      }`}
                  >
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={finalDefaultSignature}
                        alt="Default signature"
                        className="max-h-32 max-w-full rounded object-contain"
                      />
                    </div>
                    {useDefaultInDefaultTab && (
                      <div className="mt-2 text-center">
                        <span className="text-sm font-medium text-green-600">
                          ✓ Default signature activated
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <Button
                      type="button"
                      variant={useDefaultInDefaultTab ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Use Default button clicked - current state:",
                          useDefaultInDefaultTab
                        )
                        if (!useDefaultInDefaultTab) {
                          setUseDefaultInDefaultTab(true)
                          setHasSignature(true)
                          // Immediately call onSignatureChange
                          if (onSignatureChangeRef.current) {
                            console.log(
                              "Immediately calling onSignatureChangeRef with true"
                            )
                            onSignatureChangeRef.current(true)
                          }
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      <User className="h-3 w-3" />
                      {useDefaultInDefaultTab ? "Using Default" : "Use Default"}
                    </Button>
                  </div>
                </>
              ) : isLoadingDefaultSignature ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                  <p className="mb-1 text-sm font-medium">
                    Loading default signature...
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="mb-1 text-sm font-medium">
                    No default signature
                  </p>
                  <p className="text-xs">
                    You can set up a default signature in your profile settings
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }
)

SignaturePad.displayName = "SignaturePad"
