curl --request POST \
  --url http://ai-api.jdcloud.com/v1/images/gemini_flash/generations \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Authorization: Bearer pk*****' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Trace-id: test-gemini-23' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
    "model": "Gemini 3-Pro-Image-Preview",
    "stream": false,
    "contents": [
        {
            "role": "user",
            "parts": [
                {
                    "text": "describe the image, in json format output"
                },
                {
                    "fileData": {
                        "mimeType": "image/png",
                        "fileUri": "https://maas.s3.cn-north-1.jdcloud-oss.com/ERNIE-4.5-turbo-128K/baidu.png"
                    }
                }
            ]
        }
    ]
}'