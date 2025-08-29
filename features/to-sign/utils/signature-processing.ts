/**
 * Image processing utilities for signature handling
 * Implements 24eme signaturepdf-style image processing
 */

/**
 * Process signature image to remove white background and crop tightly
 * Similar to 24eme's image processing for better signature appearance
 */
export function processSignatureImage(dataUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas")
				const ctx = canvas.getContext("2d")

				if (!ctx) {
					reject(new Error("Canvas context not available"))
					return
				}

				canvas.width = img.width
				canvas.height = img.height

				// Draw original image
				ctx.drawImage(img, 0, 0)

				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const data = imageData.data

				// Find the bounds of non-white/transparent pixels
				let minX = canvas.width
				let minY = canvas.height
				let maxX = 0
				let maxY = 0

				for (let y = 0; y < canvas.height; y++) {
					for (let x = 0; x < canvas.width; x++) {
						const i = (y * canvas.width + x) * 4
						const r = data[i] ?? 0
						const g = data[i + 1] ?? 0
						const b = data[i + 2] ?? 0
						const a = data[i + 3] ?? 0

						// Check if pixel is not white/transparent (allowing some tolerance)
						const isNotWhite = (r < 240 || g < 240 || b < 240) && a > 10

						if (isNotWhite) {
							minX = Math.min(minX, x)
							minY = Math.min(minY, y)
							maxX = Math.max(maxX, x)
							maxY = Math.max(maxY, y)

							// Make white pixels transparent for better rendering
							if (r > 240 && g > 240 && b > 240) {
								data[i + 3] = 0 // Make transparent
							}
						}
					}
				}

				// If no content found, return original
				if (minX >= maxX || minY >= maxY) {
					resolve(dataUrl)
					return
				}

				// Add small padding
				const padding = 5
				minX = Math.max(0, minX - padding)
				minY = Math.max(0, minY - padding)
				maxX = Math.min(canvas.width, maxX + padding)
				maxY = Math.min(canvas.height, maxY + padding)

				// Create cropped canvas
				const croppedWidth = maxX - minX
				const croppedHeight = maxY - minY
				const croppedCanvas = document.createElement("canvas")
				const croppedCtx = croppedCanvas.getContext("2d")

				if (!croppedCtx) {
					reject(new Error("Cropped canvas context not available"))
					return
				}

				croppedCanvas.width = croppedWidth
				croppedCanvas.height = croppedHeight

				// Apply processed image data
				ctx.putImageData(imageData, 0, 0)

				// Draw cropped area onto new canvas
				croppedCtx.drawImage(
					canvas,
					minX,
					minY,
					croppedWidth,
					croppedHeight,
					0,
					0,
					croppedWidth,
					croppedHeight
				)

				// Return as data URL
				resolve(croppedCanvas.toDataURL("image/png"))
			} catch (error) {
				reject(
					error instanceof Error
						? error
						: new Error("Unknown error during image processing")
				)
			}
		}

		img.onerror = () => reject(new Error("Failed to load image"))
		img.src = dataUrl
	})
}

/**
 * Convert signature to SVG for better scalability (24eme style)
 */
export function convertSignatureToSVG(
	dataUrl: string,
	width: number,
	height: number
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			try {
				// Create SVG with embedded image
				const svg = `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <image href="${dataUrl}" width="${width}" height="${height}" />
          </svg>
        `

				const svgDataUrl = `data:image/svg+xml;base64,${btoa(svg)}`
				resolve(svgDataUrl)
			} catch (error) {
				reject(
					error instanceof Error
						? error
						: new Error("Unknown error during SVG conversion")
				)
			}
		}

		img.onerror = () =>
			reject(new Error("Failed to load image for SVG conversion"))
		img.src = dataUrl
	})
}

/**
 * Apply transparent background processing to signature
 */
export function makeSignatureTransparent(dataUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas")
				const ctx = canvas.getContext("2d")

				if (!ctx) {
					reject(new Error("Canvas context not available"))
					return
				}

				canvas.width = img.width
				canvas.height = img.height

				// Draw image
				ctx.drawImage(img, 0, 0)

				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const data = imageData.data

				// Make white/light pixels transparent
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] ?? 0
					const g = data[i + 1] ?? 0
					const b = data[i + 2] ?? 0

					// If pixel is close to white, make it transparent
					if (r > 240 && g > 240 && b > 240) {
						data[i + 3] = 0 // Set alpha to 0 (transparent)
					}
				}

				ctx.putImageData(imageData, 0, 0)
				resolve(canvas.toDataURL("image/png"))
			} catch (error) {
				reject(
					error instanceof Error
						? error
						: new Error("Unknown error during transparency processing")
				)
			}
		}

		img.onerror = () => reject(new Error("Failed to load image"))
		img.src = dataUrl
	})
}
