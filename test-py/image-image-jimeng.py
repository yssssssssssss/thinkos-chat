curl --request POST \
  --url http://ai-api.jdcloud.com/v1/imageEdit/generations \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Authorization: Bearer YOUR_API_KEY_HERE' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
    "model": "doubao-seedream-4-0-250828",
    "prompt": "生成狗狗趴在草地上的近景画面",
    "image": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimage.png",
    "size": "2K",
    "sequential_image_generation": "disabled",
    "response_format": "url",
    "watermark": true
}'