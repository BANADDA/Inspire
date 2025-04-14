# Aphrodite API Usage Guide

This guide provides detailed instructions on how to interact with deployed Aphrodite language models, including example requests and responses for each endpoint.

## Table of Contents

- [Getting Started](#getting-started)
- [Common Parameters](#common-parameters)
- [Completions API](#completions-api)
- [Chat Completions API](#chat-completions-api)
- [Embeddings API](#embeddings-api)
- [Tokenization API](#tokenization-api)
- [Deployment Management](#deployment-management)
- [Log Streaming](#log-streaming)
- [Error Handling](#error-handling)

## Getting Started

After deploying a model using the deployment API, you'll receive a URL that looks like:
```
https://c389-24-83-13-62.ngrok-free.app
```

This is your base URL for all API calls. All endpoints follow the OpenAI-compatible format.

## Common Parameters

These parameters are available across multiple endpoints:

| Parameter | Type | Description |
|-----------|------|-------------|
| `temperature` | float | Controls randomness (0-2.0, default: 1.0) |
| `max_tokens` | integer | Maximum number of tokens to generate |
| `top_p` | float | Nucleus sampling parameter (0-1.0, default: 0.9) |
| `top_k` | integer | Limits vocabulary to top k choices (default: 40) |
| `presence_penalty` | float | Penalizes repeated tokens (-2.0 to 2.0) |
| `frequency_penalty` | float | Penalizes frequent tokens (-2.0 to 2.0) |

## Completions API

### Endpoint: `/v1/completions`

Use this endpoint for standard text completion requests.

#### Request Example

```bash
curl -X POST "https://[your-tunnel-url]/v1/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a poem about artificial intelligence",
    "max_tokens": 100,
    "temperature": 0.7,
    "top_p": 0.95,
    "frequency_penalty": 0.5
  }'
```

#### Response Example

```json
{
  "id": "cmpl-abc123def456",
  "object": "text_completion",
  "created": 1677825419,
  "model": "qwen/qwen1.5-1.8b",
  "choices": [
    {
      "text": "in silicon dreams and digital souls,\nArtificial minds begin to unfold.\nLines of code weave tapestries of thought,\nIntelligence that mankind has wrought.\n\nLearning patterns in the data stream,\nEvolving systems, more than they seem.\nSilently thinking at lightning pace,\nA new form of life in digital space.",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 74,
    "total_tokens": 82
  }
}
```

## Chat Completions API

### Endpoint: `/v1/chat/completions`

Use this endpoint for chat-based interactions, which is recommended for most conversational applications.

#### Request Example

```bash
curl -X POST "https://[your-tunnel-url]/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant specialized in quantum physics."},
      {"role": "user", "content": "Explain quantum entanglement in simple terms."}
    ],
    "max_tokens": 150,
    "temperature": 0.7
  }'
```

#### Response Example

```json
{
  "id": "chatcmpl-xyz789abc",
  "object": "chat.completion",
  "created": 1677825420,
  "model": "qwen/qwen1.5-1.8b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum entanglement is like having two magical coins. When these coins are entangled, they behave in a synchronized way, no matter how far apart they are. If you flip one coin and it lands on heads, the other coin will instantly show heads too, even if it's on the other side of the universe! This happens without any visible connection between them, which is why Einstein called it \"spooky action at a distance.\" It's as if the coins are somehow communicating faster than light, but physicists believe no actual information is being transmitted. This strange connection is fundamental to quantum physics and is being explored for technologies like quantum computing and secure communications."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 122,
    "total_tokens": 154
  }
}
```

### Streaming Example

You can also stream responses by adding the `stream: true` parameter:

```bash
curl -X POST "https://[your-tunnel-url]/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Count from 1 to 5"}
    ],
    "max_tokens": 50,
    "stream": true
  }'
```

This will return a stream of events in the format:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{"role":"assistant","content":"1"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{"content":", 2"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{"content":", 3"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{"content":", 4"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{"content":", 5"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"qwen/qwen1.5-1.8b","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## Embeddings API

### Endpoint: `/v1/embeddings`

Use this endpoint to generate text embeddings that can be used for semantic search, classification, or measuring text similarity.

#### Request Example

```bash
curl -X POST "https://[your-tunnel-url]/v1/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "The quick brown fox jumps over the lazy dog"
  }'
```

#### Response Example

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0023064255, -0.009327292, ..., -0.0028842222],
      "index": 0
    }
  ],
  "model": "qwen/qwen1.5-1.8b",
  "usage": {
    "prompt_tokens": 9,
    "total_tokens": 9
  }
}
```

Note: The actual embedding is a vector of floating-point numbers (typically 768 or more dimensions). The example above shows an abbreviated version.

## Tokenization API

### Endpoint: `/v1/tokenize`

Use this endpoint to tokenize text input, which is useful for understanding token counts and processing text before sending larger requests.

#### Request Example

```bash
curl -X POST "https://[your-tunnel-url]/v1/tokenize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, world! 你好，世界！"
  }'
```

#### Response Example

```json
{
  "tokens": [9906, 11, 4435, 0, 55, 382, 55, 133, 0],
  "token_strings": ["Hello", ",", " world", "!", " ", "你好", "，", "世界", "！"],
  "token_count": 9
}
```

## Deployment Management

### Creating a New Deployment

#### Endpoint: `/api/v1/deploy`

```bash
curl -X POST "https://[your-api-url]/api/v1/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "qwen/qwen1.5-1.8b",
    "user_id": "user123",
    "api_name": "My Qwen API",
    "ssh_config": {
        "host": "my-server.example.com",
        "username": "username",
        "port": 22,
        "password": "password"
    }
  }'
```

#### Response Example

```json
{
  "status": "queued",
  "deployment_id": "4304fb47-5936-4fe7-adda-c6b34bc6c63e",
  "model_id": "qwen/qwen1.5-1.8b",
  "monitor_url": "https://[your-api-url]/api/v1/deployments/4304fb47-5936-4fe7-adda-c6b34bc6c63e/status"
}
```

### Checking Deployment Status

#### Endpoint: `/api/v1/deployments/{deployment_id}/status`

```bash
curl "https://[your-api-url]/api/v1/deployments/4304fb47-5936-4fe7-adda-c6b34bc6c63e/status"
```

#### Response Example

```json
{
  "status": "active",
  "deployment_id": "4304fb47-5936-4fe7-adda-c6b34bc6c63e",
  "model_id": "qwen/qwen1.5-1.8b",
  "container_id": "cc5866b72541",
  "api_url": "https://a1b2-203-0-113-42.ngrok-free.app",
  "created_at": "2025-03-14T23:55:12",
  "updated_at": "2025-03-15T00:02:45"
}
```

Possible status values:
- `queued`: Deployment has been queued for processing
- `starting`: Container is being created and initialized
- `active`: Deployment is active and ready for use
- `failed`: Deployment has failed (check logs for details)
- `stopped`: Deployment has been manually stopped

## Log Streaming

### Endpoint: `/api/v1/deployments/{deployment_id}/logs/stream`

Stream real-time logs from a deployment with optional timestamps.

```bash
curl -N "https://[base url]/api/v1/deployments/deployment id/logs/stream?host=24.83.13.62&username=username&port=22&password=password&timestamps=true"
```

#### Response Example

The response is a stream of Server-Sent Events (SSE):

```
event: deployment_info
data: {"deployment_id": "4304fb47-5936-4fe7-adda-c6b34bc6c63e", "model_id": "qwen/qwen1.5-1.8b", "status": "active", "container_id": "cc5866b72541"}

event: metadata
data: {"container_id": "cc5866b72541", "timestamp": "2025-03-14T23:09:18.506365", "is_running": true, "started_at": "2025-03-15T04:53:33.468900707Z", "cpu_usage": "1.90%", "memory_usage": "10.75GiB / 125.7GiB"}

event: log
data: {"timestamp": "2025-03-15T05:08:40.768Z", "content": "0.0%, CPU KV cache usage: 0.0%."}

event: log
data: {"timestamp": "2025-03-15T05:08:50.781Z", "content": "INFO: Avg prompt throughput: 0.0 tokens/s, Avg generation throughput: 0.0"}
```

## Error Handling

### Common Error Responses

#### Invalid Request Format

```json
{
  "error": {
    "message": "Invalid request format: 'prompt' is a required field",
    "type": "invalid_request_error",
    "param": "prompt",
    "code": 400
  }
}
```

#### Model Not Found

```json
{
  "error": {
    "message": "Model 'nonexistent-model' not found",
    "type": "invalid_request_error",
    "param": "model",
    "code": 404
  }
}
```

#### Deployment Errors

```json
{
  "error": {
    "message": "Deployment failed: unable to get image 'Model/With-Uppercase': Error response from daemon: invalid reference format: repository name must be lowercase",
    "type": "deployment_error",
    "code": 500
  }
}
```

#### Rate Limit Exceeded

```json
{
  "error": {
    "message": "Rate limit exceeded, please try again in 10s",
    "type": "rate_limit_error",
    "code": 429
  }
}
```

## Tips for Optimal Usage

1. **Use Chat API for conversational applications**: The `/v1/chat/completions` endpoint provides better results for conversational applications compared to the completions API.

2. **Optimize token usage**: Use shorter prompts and reasonable `max_tokens` values to reduce costs and latency.

3. **Adjust temperature**: Lower values (0.1-0.4) produce more deterministic outputs, while higher values (0.7-1.0) produce more creative responses.

4. **Use streaming**: For user-facing applications, the streaming API provides a better user experience by showing incremental responses.

5. **Monitor deployments**: Regularly check deployment status and logs to ensure your models are running correctly. 