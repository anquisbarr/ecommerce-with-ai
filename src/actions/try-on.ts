"use server";
import "server-only";
import OpenAI from "openai";
import { getProductById } from "@/lib/mock-data";
import type { TryOnResponse, OpenRouterResponse } from "@/types";
import { z } from "zod";
import fs from "fs";
import path from "path";

// Sistema de logging consistente
const emojis = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "🔧",
    loading: "⏳",
};

function logTryOn(
    message: string,
    type: "success" | "error" | "warning" | "info" | "loading" = "info",
) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    const emoji = emojis[type] || emojis.info;
    console.log(`${emoji} ${prefix} ${message}`);
}

// Verificar API Key
if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set.");
}

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer":
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        "X-Title": "Ecommerce AI Try-On",
    },
});

const TryOnSchema = z.object({
    productId: z.string().min(1, "ID de producto requerido"),
    photo: z
        .instanceof(File, { message: "Foto requerida" })
        .refine((f) => f.size > 0, "La foto no puede estar vacía")
        .refine(
            (f) => f.size <= 5 * 1024 * 1024,
            "La foto debe ser menor a 5MB",
        )
        .refine(
            (f) =>
                ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
                    f.type,
                ),
            "Solo JPG, PNG o WebP",
        ),
});

async function fileToBase64(file: File): Promise<string> {
    const buf = Buffer.from(await file.arrayBuffer());
    return buf.toString("base64");
}

async function fileToDataUrl(file: File): Promise<string> {
    const base64 = await fileToBase64(file);
    return `data:${file.type};base64,${base64}`;
}

async function loadProductImage(
    productImageUrl: string,
): Promise<string | null> {
    try {
        // Método 1: Intentar cargar desde URL (funciona en Vercel/Railway/Local)
        try {
            const fullProductUrl = productImageUrl.startsWith("http")
                ? productImageUrl
                : `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${productImageUrl}`;

            logTryOn(`Cargando imagen del producto desde: ${fullProductUrl}`, "info");

            const productResponse = await fetch(fullProductUrl);
            if (productResponse.ok) {
                const productBuffer = await productResponse.arrayBuffer();
                const productBase64 =
                    Buffer.from(productBuffer).toString("base64");
                
                // Detectar tipo MIME de la respuesta
                const contentType = productResponse.headers.get('content-type') || 'image/jpeg';
                
                logTryOn("Imagen del producto cargada desde URL", "success");
                return `data:${contentType};base64,${productBase64}`;
            } else {
                logTryOn(`Error HTTP: ${productResponse.status} ${productResponse.statusText}`, "warning");
            }
        } catch (urlError) {
            logTryOn(`Error cargando desde URL: ${urlError}`, "warning");
        }

        // Método 2: Fallback - Intentar desde archivo local (solo funciona en local)
        if (process.env.NODE_ENV === 'development') {
            try {
                const productImagePath = path.join(
                    process.cwd(),
                    "public",
                    productImageUrl,
                );
                if (fs.existsSync(productImagePath)) {
                    const productBuffer = fs.readFileSync(productImagePath);
                    const productBase64 = productBuffer.toString("base64");
                    logTryOn(
                        "Imagen del producto cargada desde archivo local (fallback)",
                        "info",
                    );
                    return `data:image/jpeg;base64,${productBase64}`;
                }
            } catch (fsError) {
                logTryOn(
                    `Error en fallback de archivo local: ${fsError}`,
                    "warning",
                );
            }
        }

        logTryOn("No se pudo cargar la imagen del producto por ningún método", "error");
        return null;
    } catch (error) {
        logTryOn(
            `Error general cargando imagen del producto: ${error}`,
            "error",
        );
        return null;
    }
}

export async function tryOn(formData: FormData): Promise<TryOnResponse> {
    const startTime = Date.now();

    try {
        logTryOn(
            "Iniciando proceso de try-on virtual con OpenRouter",
            "loading",
        );

        const raw = {
            productId: formData.get("productId") as string,
            photo: formData.get("photo") as File,
        };
        const { productId, photo } = TryOnSchema.parse(raw);

        logTryOn(`Datos recibidos - Producto ID: ${productId}`, "info");
        logTryOn(
            `Foto del usuario: ${photo.name} (${(photo.size / (1024 * 1024)).toFixed(2)} MB, ${photo.type})`,
            "info",
        );

        const product = getProductById(productId);
        if (!product) {
            logTryOn(`Producto no encontrado: ${productId}`, "error");
            return { success: false, error: "Producto no encontrado" };
        }

        if (!product.inStock) {
            logTryOn(`Producto fuera de stock: ${product.name}`, "warning");
            return {
                success: false,
                error: "Este producto no está disponible actualmente",
            };
        }

        logTryOn("Producto encontrado y disponible", "info");

        // Convertir foto del usuario a data URL
        const userPhotoDataUrl = await fileToDataUrl(photo);
        logTryOn("Foto del usuario convertida a data URL", "info");

        // Cargar imagen del producto
        const productImageUrl = product.images[0];
        let productImageDataUrl: string | null = null;

        if (productImageUrl) {
            productImageDataUrl = await loadProductImage(productImageUrl);
        }

        if (!productImageDataUrl) {
            logTryOn("No se pudo cargar la imagen del producto", "warning");
            return {
                success: false,
                error: "No se pudo cargar la imagen del producto",
            };
        }

        logTryOn("Imágenes preparadas para análisis", "info");

        // Performance-optimized prompts for virtual try-on image generation
        // Three strategic approaches with varying focus and complexity
        const tryDifferentPrompts = [
            // Approach 1: System-guided professional virtual try-on with clear hierarchy
            {
                role: "system" as const,
                content: [
                    {
                        type: "text" as const,
                        text: "You are an expert virtual try-on assistant specializing in realistic clothing visualization. Your role is to combine a reference photo of a person with a clothing item image to generate a photorealistic result showing the person wearing the new garment. Focus on natural fit, proper lighting matching, and maintaining the person's identity and pose.",
                    },
                ],
            },
            {
                role: "user" as const,
                content: [
                    {
                        type: "text" as const,
                        text: `Generate a virtual try-on image using the following inputs:

INPUT 1 (Person): A photo showing the user who wants to virtually try on clothing. Note their body type, current pose, lighting conditions, and background.

INPUT 2 (Garment): An image of the clothing item to be virtually fitted onto the person from Input 1.

OUTPUT REQUIREMENTS:
- Create a realistic image of the person from Input 1 wearing the garment from Input 2
- Preserve the person's face, skin tone, body proportions, and original pose
- Match the garment's color, pattern, texture, and style exactly as shown in Input 2
- Ensure natural draping and fit appropriate to the person's body type
- Maintain consistent lighting and shadows with the original photo
- Keep the original background unchanged
- Output must be a single high-quality image showing the successful virtual try-on`,
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: userPhotoDataUrl,
                            detail: "high" as const,
                        },
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: productImageDataUrl,
                            detail: "high" as const,
                        },
                    },
                ],
            },
            // Approach 2: Technical specification with garment analysis focus
            {
                role: "system" as const,
                content: [
                    {
                        type: "text" as const,
                        text: "You are a technical virtual fitting expert. Analyze both the user's photo and the clothing item carefully. Extract garment details including cut, fabric type, color, pattern, and fit style. Generate a composite image that realistically applies the garment onto the user while maintaining technical accuracy in fit and drape.",
                    },
                ],
            },
            {
                role: "user" as const,
                content: [
                    {
                        type: "text" as const,
                        text: `VIRTUAL FITTING TASK - Technical Implementation

REFERENCE IMAGE: Photo of user (maintain: identity, pose, lighting, background)
PRODUCT IMAGE: Clothing item to apply (analyze: style, fabric, fit, details)

TECHNICAL SPECIFICATIONS:
1. Garment Analysis:
   - Identify clothing type (shirt, pants, dress, jacket, etc.)
   - Note fabric properties (texture, weight, drape characteristics)
   - Extract color values and patterns accurately
   - Determine appropriate fit (slim, regular, loose) based on garment style

2. User Analysis:
   - Maintain exact body proportions and posture
   - Preserve facial features and skin tone
   - Note current clothing for natural transition points
   - Analyze lighting direction and intensity

3. Composite Generation:
   - Apply garment to appropriate body areas
   - Ensure realistic fabric behavior (wrinkles, folds, tension)
   - Match lighting and cast appropriate shadows
   - Blend edges naturally at transition points
   - Maintain photo-realistic quality throughout

Deliver a single composite image showing the user wearing the analyzed garment naturally and realistically.`,
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: userPhotoDataUrl,
                            detail: "high" as const,
                        },
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: productImageDataUrl,
                            detail: "high" as const,
                        },
                    },
                ],
            },
            // Approach 3: E-commerce focused with quality standards
            {
                role: "system" as const,
                content: [
                    {
                        type: "text" as const,
                        text: "You are a professional e-commerce virtual try-on generator. Your output should meet commercial photography standards suitable for online retail. Create images that help customers visualize how clothing items will look on them. Focus on accuracy, quality, and realistic representation.",
                    },
                ],
            },
            {
                role: "user" as const,
                content: [
                    {
                        type: "text" as const,
                        text: `E-COMMERCE VIRTUAL TRY-ON - Professional Output Required

CUSTOMER PHOTO: User wants to see how this item looks on them
PRODUCT IMAGE: The retail clothing item to visualize

COMMERCIAL QUALITY STANDARDS:

Image Quality:
- High resolution suitable for e-commerce display
- Professional lighting and color accuracy
- Clean composition with clear garment visibility
- No artifacts, distortions, or unnatural transitions

Garment Representation:
- Exact color and pattern reproduction from product image
- Accurate depiction of style, cut, and design features
- Proper scale and proportions relative to user's body
- Realistic fabric behavior and drape

User Preservation:
- Customer's face and identity clearly recognizable
- Natural skin tones and textures maintained
- Original pose and body language preserved
- Background context maintained for realistic context

Output: A single, publication-ready image showing the customer wearing the product realistically. This image should help the customer make a confident purchase decision.`,
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: userPhotoDataUrl,
                            detail: "high" as const,
                        },
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: productImageDataUrl,
                            detail: "high" as const,
                        },
                    },
                ],
            },
        ];

        // Generate 3 different versions in parallel with timeout handling
        logTryOn(
            "Generando 3 versiones en paralelo (máx. 2 min)...",
            "loading",
        );

        // Create timeout promise
        const createTimeoutPromise = (timeoutMs: number) => {
            return new Promise<never>((_, reject) => {
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                `Timeout después de ${timeoutMs / 1000}s`,
                            ),
                        ),
                    timeoutMs,
                );
            });
        };

        // Create individual generation promises
        const generateImage = async (
            promptIndex: number,
        ): Promise<{ index: number; imageUrl?: string; error?: string }> => {
            try {
                // Each approach now contains 2 messages (system + user)
                // promptIndex 0-1: Approach 1 (indices 0, 1)
                // promptIndex 2-3: Approach 2 (indices 2, 3)
                // promptIndex 4-5: Approach 3 (indices 4, 5)
                const baseIndex = promptIndex * 2;
                const messages = [
                    tryDifferentPrompts[baseIndex],
                    tryDifferentPrompts[baseIndex + 1],
                ];
                
                // More conservative temperature progression for stability
                const temperature = 0.7 + promptIndex * 0.05;

                logTryOn(`Iniciando versión ${promptIndex + 1}...`, "info");

                // Race between API call and timeout (45 seconds per image)
                const response = (await Promise.race([
                    openai.chat.completions.create({
                        model: "google/gemini-2.5-flash-image",
                        messages,
                        max_tokens: 4000,
                        temperature: Math.min(temperature, 0.85),
                    }),
                    createTimeoutPromise(45000), // 45 second timeout per image
                ])) as unknown as OpenRouterResponse;

                logTryOn(
                    `Versión ${promptIndex + 1}: Respuesta recibida`,
                    "info",
                );

                if (!response.choices?.[0]?.message) {
                    return {
                        index: promptIndex,
                        error: "No hay mensaje en respuesta",
                    };
                }

                const message = response.choices[0].message;
                let imageUrl: string | null = null;

                // Extract image from response
                if (
                    message.images &&
                    Array.isArray(message.images) &&
                    message.images.length > 0
                ) {
                    imageUrl = message.images[0]?.image_url?.url;
                } else if (message.content) {
                    const content = message.content;
                    if (typeof content === "string" && content.length > 10) {
                        if (content.includes("data:image")) {
                            imageUrl = content;
                        } else if (content.includes("base64")) {
                            const base64Match = content.match(
                                /base64,([A-Za-z0-9+/=]+)/,
                            );
                            if (base64Match) {
                                imageUrl = `data:image/png;base64,${base64Match[1]}`;
                            }
                        } else {
                            const base64Match = content.match(
                                /[A-Za-z0-9+/]{100,}={0,2}/,
                            );
                            if (base64Match) {
                                imageUrl = `data:image/png;base64,${base64Match[0]}`;
                            }
                        }
                    }
                }

                if (imageUrl && imageUrl.startsWith("data:image")) {
                    return { index: promptIndex, imageUrl };
                } else {
                    return {
                        index: promptIndex,
                        error: "No se pudo extraer imagen válida",
                    };
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                return { index: promptIndex, error: errorMessage };
            }
        };

        // Execute all generations in parallel with overall timeout
        try {
            // We now have 3 approaches, each with 2 messages (system + user)
            // Generate 3 images, one for each approach
            const allPromises = [0, 1, 2].map((approachIndex) =>
                generateImage(approachIndex),
            );

            logTryOn(
                "Iniciando generación en paralelo de 3 versiones...",
                "loading",
            );

            // Use Promise.allSettled directly with individual timeouts (each image has 45s timeout)
            const responses = await Promise.allSettled(allPromises);

            const results: string[] = [];
            const errors: string[] = [];

            responses.forEach((response, index) => {
                if (response.status === "fulfilled") {
                    const result = response.value;
                    if (result.imageUrl) {
                        results.push(result.imageUrl);
                        logTryOn(
                            `Versión ${result.index + 1}: Exitosa`,
                            "success",
                        );
                    } else {
                        errors.push(
                            `Versión ${result.index + 1}: ${result.error}`,
                        );
                        logTryOn(
                            `Versión ${result.index + 1}: ${result.error}`,
                            "warning",
                        );
                    }
                } else {
                    errors.push(`Versión ${index + 1}: ${response.reason}`);
                    logTryOn(
                        `Versión ${index + 1}: Error - ${response.reason}`,
                        "error",
                    );
                }
            });

            const processingTime = Date.now() - startTime;
            logTryOn(
                `Generación paralela completada en ${processingTime}ms`,
                "info",
            );

            // Return results if we have at least one successful image
            if (results.length > 0) {
                logTryOn(
                    `Try-on completado: ${results.length} imagen(es) generada(s)`,
                    "success",
                );
                return {
                    success: true,
                    result: results[0], // Primary result
                    results: results, // All successful results
                    errors: errors.length > 0 ? errors : undefined,
                };
            }
        } catch (error) {
            logTryOn(`Error en generación paralela: ${error}`, "error");
        }

        // All attempts failed
        logTryOn("Todas las versiones fallaron", "error");

        // Try a simpler approach - maybe the model doesn't support image generation
        logTryOn("Verificando capacidades del modelo...", "warning");

        try {
            const simpleTestResponse = await openai.chat.completions.create({
                model: "google/gemini-2.5-flash-image",
                messages: [
                    {
                        role: "user",
                        content:
                            "Can you generate images? Please respond with 'yes' or 'no' and explain your capabilities.",
                    },
                ],
                max_tokens: 200,
            });

            logTryOn("Respuesta del test simple:", "info");
            console.log(
                "Simple test response:",
                JSON.stringify(simpleTestResponse, null, 2),
            );

            if (simpleTestResponse.choices?.[0]?.message?.content) {
                logTryOn(
                    `Capacidades del modelo: ${simpleTestResponse.choices[0].message.content}`,
                    "info",
                );
            }
        } catch (testError) {
            logTryOn(`Error en test de capacidades: ${testError}`, "error");
        }

        logTryOn(
            "No se pudo generar imagen del try-on. El modelo puede no soportar generación de imágenes.",
            "error",
        );
        return {
            success: false,
            error: "El modelo Gemini 2.5 Flash Image a través de OpenRouter no pudo generar una imagen. Esto puede deberse a limitaciones del modelo o configuración del API.",
        };
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logTryOn(`Error crítico después de ${processingTime}ms`, "error");

        if (error instanceof z.ZodError) {
            const first = error.issues[0];
            logTryOn(
                `Error de validación: ${first.message} (campo: ${first.path.join(".")})`,
                "error",
            );
            return {
                success: false,
                error: `Error de validación: ${first.message}`,
            };
        }

        logTryOn(`Error no manejado: ${(error as Error).message}`, "error");
        return {
            success: false,
            error: (error as Error).message || "Error interno del servidor",
        };
    }
}

export async function analyzeUserPhoto(formData: FormData): Promise<{
    success: boolean;
    description?: string;
    error?: string;
}> {
    try {
        logTryOn(
            "Iniciando análisis de imagen del usuario con OpenRouter",
            "loading",
        );

        const photo = formData.get("photo") as File;

        if (!photo || photo.size === 0) {
            logTryOn("No se proporcionó ninguna foto", "error");
            return {
                success: false,
                error: "No se proporcionó ninguna foto",
            };
        }

        logTryOn(
            `Analizando imagen: ${photo.name || "sin nombre"} (${(photo.size / (1024 * 1024)).toFixed(2)} MB, ${photo.type})`,
            "info",
        );

        // Validar tipo de archivo
        if (
            !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
                photo.type,
            )
        ) {
            logTryOn(`Formato no válido: ${photo.type}`, "warning");
            return {
                success: false,
                error: "Formato de imagen no válido. Use JPG, PNG o WebP",
            };
        }

        // Validar tamaño
        if (photo.size > 5 * 1024 * 1024) {
            logTryOn(
                `Imagen demasiado grande: ${(photo.size / (1024 * 1024)).toFixed(2)} MB`,
                "warning",
            );
            return {
                success: false,
                error: "La imagen es demasiado grande. Máximo 5MB",
            };
        }

        logTryOn("Enviando imagen a OpenRouter para análisis...", "loading");

        // Convertir foto a data URL
        const photoDataUrl = await fileToDataUrl(photo);

        const messages = [
            {
                role: "user" as const,
                content: [
                    {
                        type: "text" as const,
                        text: "Describe brevemente a la persona en esta imagen incluyendo su ropa, pose, iluminación y fondo. Sé conciso pero descriptivo.",
                    },
                    {
                        type: "image_url" as const,
                        image_url: {
                            url: photoDataUrl,
                            detail: "high" as const,
                        },
                    },
                ],
            },
        ];

        const response = await openai.chat.completions.create({
            model: "google/gemini-2.5-flash-image",
            messages,
            max_tokens: 300,
            temperature: 0.3,
        });

        if (!response.choices?.[0]?.message?.content) {
            throw new Error(
                "No valid response from OpenRouter API for analysis",
            );
        }

        const description = response.choices[0].message.content;

        if (description && typeof description === "string") {
            logTryOn("Análisis de imagen completado exitosamente", "success");
            logTryOn(
                `Descripción generada: ${description.substring(0, 100)}...`,
                "info",
            );
            return { success: true, description };
        } else {
            logTryOn("No se recibió descripción del análisis", "warning");
            return {
                success: false,
                error: "No se pudo analizar la imagen",
            };
        }
    } catch (error) {
        logTryOn(
            `Error inesperado en análisis: ${(error as Error).message}`,
            "error",
        );
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error al analizar la imagen",
        };
    }
}
