import { z } from 'zod'

export const MIN_PROMPT_LENGTH = 8
export const MAX_PROMPT_LENGTH = 1024

export const generationRequestSchema = z.object({
  prompt: z
    .string({ required_error: 'Describe a 3D object before generating.' })
    .superRefine((value, ctx) => {
      const prompt = value.trim()
      if (prompt.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Describe a 3D object before generating.',
        })
        return
      }
      if (prompt.length < MIN_PROMPT_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Your prompt is too short.',
        })
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Your prompt is too long. Keep it under 1024 characters.',
        })
      }
    })
    .transform((value) => value.trim()),
})

export const generationIdSchema = z.object({
  id: z.string().uuid({ message: 'Generation id is invalid.' }),
})

export type GenerationRequest = z.infer<typeof generationRequestSchema>
