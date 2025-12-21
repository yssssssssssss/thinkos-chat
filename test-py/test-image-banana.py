curl --request POST \
  --url http://ai-api.jdcloud.com/v1/images/gemini_flash/generations \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Authorization: Bearer pk******' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Trace-id: test-gemini-23' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
    "model": "Gemini-2.5-flash-image-preview",
    "contents": {
        "role": "USER",
        "parts": [
          {"inline_data":{
                 "mimeType":"image/png",
                 "data":"iVBORw0KGgo..."
                 },
          },
          {
            "text": "Generate a photo of a typical breakfast."
          }]
    },
    "generation_config": {
        "response_modalities": [
            "TEXT",
            "IMAGE"
        ]
    },
    "safety_settings": {
        "method": "PROBABILITY",
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    "stream":false
}'