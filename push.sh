#!/bin/bash

# 腾讯云容器镜像服务（TCR）控制台：
# https://console.cloud.tencent.com/tcr
# 镜像仓库密码在「访问凭证」中设置

# Ensure the script exits if any command fails
set -e

# 默认值（可被 .local-config 中的同名变量覆盖）
TENCENT_REGISTRY="ccr.ccs.tencentyun.com"   # 个人版固定域名；企业版为 <实例名>.tencentcloudcr.com
NAMESPACE="kiratesuly-apps"
IMAGE_NAME="ai-agent-draw-io-app-front"
IMAGE_TAG="1.0"

# 读取本地配置文件
if [ -f ".local-config" ]; then
  # shellcheck disable=SC1091
  source .local-config
else
  echo ".local-config 文件不存在，请创建并填写 TENCENT_USERNAME 和 TENCENT_PASSWORD"
  exit 1
fi

# 校验必填项
if [ -z "${TENCENT_USERNAME}" ] || [ -z "${TENCENT_PASSWORD}" ]; then
  echo "请在 .local-config 中填写 TENCENT_USERNAME（腾讯云账号 ID）和 TENCENT_PASSWORD（镜像仓库密码）"
  exit 1
fi

# 本地镜像名需与 build.sh 构建出的镜像名一致
LOCAL_IMAGE="${LOCAL_IMAGE:-${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}}"
REMOTE_IMAGE="${TENCENT_REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

# Login to Tencent Cloud Docker Registry
echo "Logging into Tencent Cloud Docker Registry (${TENCENT_REGISTRY})..."
echo "${TENCENT_PASSWORD}" | docker login --username="${TENCENT_USERNAME}" --password-stdin "${TENCENT_REGISTRY}"

# Tag the Docker image
echo "Tagging the Docker image..."
docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}"

# Push the Docker image to Tencent Cloud
echo "Pushing the Docker image to Tencent Cloud..."
docker push "${REMOTE_IMAGE}"

echo "Docker image pushed successfully!"

echo "检出地址：docker pull ${REMOTE_IMAGE}"
echo "标签设置：docker tag ${REMOTE_IMAGE} ${LOCAL_IMAGE}"

# Logout from Tencent Cloud Docker Registry
echo "Logging out from Tencent Cloud Docker Registry..."
docker logout "${TENCENT_REGISTRY}"
