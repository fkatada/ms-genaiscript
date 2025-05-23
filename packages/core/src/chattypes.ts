/**
 * This module defines TypeScript types and interfaces for chat completions using the OpenAI API.
 * These types represent structured data for various chat-related functionalities.
 *
 * Tags: TypeScript, OpenAI, Chat, Types, Interfaces
 */

import OpenAI from "openai"

export type ChatModel = OpenAI.Models.Model

export type ChatModels = {
    object: "list"
    data: Partial<ChatModel>[]
}
export type ChatCompletionToolChoiceOption =
    OpenAI.Chat.ChatCompletionToolChoiceOption
export type ChatCompletionNamedToolChoice =
    OpenAI.Chat.ChatCompletionNamedToolChoice
export type ChatCompletionReasoningEffort = OpenAI.ReasoningEffort

// Aliases for OpenAI chat completion types
export type ChatCompletionUsage = OpenAI.Completions.CompletionUsage & {
    duration?: number
}
export type ChatCompletionUsageCompletionTokensDetails =
    OpenAI.Completions.CompletionUsage.CompletionTokensDetails
export type ChatCompletionUsagePromptTokensDetails =
    OpenAI.Completions.CompletionUsage.PromptTokensDetails

export type ImageGenerationResponse = OpenAI.Images.ImagesResponse

// Text content part of a chat completion
export type ChatCompletionContentPartText =
    OpenAI.Chat.Completions.ChatCompletionContentPartText

// General content part of a chat completion
export type ChatCompletionContentPart =
    OpenAI.Chat.Completions.ChatCompletionContentPart
export type ChatCompletionContentPartRefusal =
    OpenAI.Chat.Completions.ChatCompletionContentPartRefusal

export type ChatCompletionContentPartInputAudio =
    OpenAI.Chat.Completions.ChatCompletionContentPartInputAudio

// Tool used in a chat completion
export type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool

// Chunk of a chat completion response
export type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk
export type ChatCompletionChunkChoice =
    OpenAI.Chat.Completions.ChatCompletionChunk.Choice & {
        delta?: ChatCompletionMessageReasoningContentParam
    }

export type ChatCompletionTokenLogprob = OpenAI.ChatCompletionTokenLogprob

export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion
export type ChatCompletionChoice =
    OpenAI.Chat.Completions.ChatCompletion.Choice & {
        message: ChatCompletionMessage
    }

export interface ChatCompletionMessageParamCacheControl {
    cacheControl?: PromptCacheControlType
}
export type ChatCompletionMessage =
    OpenAI.Chat.Completions.ChatCompletionMessage &
        ChatCompletionMessageReasoningContentParam
// Parameters for a system message in a chat completion
export type ChatCompletionSystemMessageParam =
    OpenAI.Chat.Completions.ChatCompletionSystemMessageParam &
        ChatCompletionMessageParamCacheControl

// Parameters for a tool message in a chat completion
export type ChatCompletionToolMessageParam =
    OpenAI.Chat.Completions.ChatCompletionToolMessageParam &
        ChatCompletionMessageParamCacheControl
export type ChatCompletionFunctionMessageParam =
    OpenAI.Chat.Completions.ChatCompletionFunctionMessageParam &
        ChatCompletionMessageParamCacheControl

/**
 * Type representing parameters for chat completion messages.
 */
export type ChatCompletionMessageParam =
    | ChatCompletionSystemMessageParam
    | ChatCompletionUserMessageParam
    | ChatCompletionAssistantMessageParam
    | ChatCompletionToolMessageParam
    | ChatCompletionFunctionMessageParam

/**
 * Type representing a request to create a chat completion, extending from OpenAI's
 * streaming parameters minus the 'messages' property.
 */
export type CreateChatCompletionRequest = Omit<
    OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
    "messages"
> & {
    /**
     * A list of messages comprising the conversation so far.
     */
    messages: ChatCompletionMessageParam[]
}

export interface ChatCompletionMessageReasoningContentParam {
    reasoning_content?: string
    signature?: string
}

// Parameters for an assistant message in a chat completion
export type ChatCompletionAssistantMessageParam =
    OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam &
        ChatCompletionMessageParamCacheControl &
        ChatCompletionMessageReasoningContentParam

export type ChatCompletionChunkChoiceChoiceDelta =
    OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta &
        ChatCompletionMessageReasoningContentParam

// Parameters for a user message in a chat completion
export type ChatCompletionUserMessageParam =
    OpenAI.Chat.Completions.ChatCompletionUserMessageParam &
        ChatCompletionMessageParamCacheControl

// Image content part of a chat completion
export type ChatCompletionContentPartImage =
    OpenAI.Chat.Completions.ChatCompletionContentPartImage

export type ChatCompletionMessageToolCall =
    OpenAI.Chat.Completions.ChatCompletionMessageToolCall

// Parameters for creating embeddings
export type EmbeddingCreateParams = OpenAI.Embeddings.EmbeddingCreateParams

// Response type for creating embeddings
export type EmbeddingCreateResponse = OpenAI.Embeddings.CreateEmbeddingResponse

export interface EmbeddingResult {
    data?: number[][]
    model?: string
    error?: string
    status: "success" | "error" | "rate_limited" | "cancelled"
}

/**
 * Interface representing a call to a chat completion tool.
 */
export interface ChatCompletionToolCall {
    id: string // Unique identifier for the tool call
    name: string // Tool name being called
    arguments?: string // Optional arguments for the tool
}

/**
 * Interface representing a response from chat completion.
 */
export interface ChatCompletionResponse {
    text?: string // Optional text response
    reasoning?: string // Optional reasoning content
    signature?: string // cryptographic signature of the response
    cached?: boolean // Indicates if the response was cached
    variables?: Record<string, string> // Optional variables associated with the response
    toolCalls?: ChatCompletionToolCall[] // List of tool calls made during the response
    finishReason?: // Reason why the chat completion finished
    "stop" | "length" | "tool_calls" | "content_filter" | "cancel" | "fail"
    usage?: ChatCompletionUsage // Usage information for the completion
    model?: string // Model used for the completion
    error?: SerializedError
    logprobs?: ChatCompletionTokenLogprob[]
    duration?: number // Duration of the completion in milliseconds
}

export type ChatFinishReason = ChatCompletionResponse["finishReason"]

// Alias for OpenAI's API error type
export const ModelError = OpenAI.APIError

/**
 * Interface representing a progress report for chat completions.
 */
export interface ChatCompletionsProgressReport {
    tokensSoFar: number // Number of tokens processed so far
    responseSoFar: string // Partial response generated so far
    responseChunk: string // Current chunk of response being processed
    responseTokens?: Logprob[] // Tokens in the current response chunk
    reasoningTokens?: Logprob[] // Tokens in the current reasoning content
    reasoningSoFar?: string // Partial reasoning content generated so far
    reasoningChunk?: string // Current chunk of reasoning content being processed
    inner: boolean // Indicates if this is an inner report
}

/**
 * Interface representing options for chat completions.
 */
export interface ChatCompletionsOptions {
    partialCb?: (progress: ChatCompletionsProgressReport) => void // Callback for partial responses
    requestOptions?: Partial<Omit<RequestInit, "signal">> // Custom request options
    maxCachedTemperature?: number // Max temperature for caching responses
    maxCachedTopP?: number // Max top-p for caching responses
    cache?: boolean | string // Cache setting or cache name
    retry?: number // Number of retries for failed requests
    retryDelay?: number // Delay between retries
    maxDelay?: number // Maximum delay for retry attempts
    inner: boolean // Indicates if the option is for inner processing
}
