#!/usr/bin/env python3
# AI 生图脚本 - 生成"拿铁小龙虾"形象
# 使用 DALL-E 3 API

import os
import requests
import json
from datetime import datetime

# 提示词 - 详细描述"拿铁小龙虾"形象
PROMPT = """
A cute cartoon lobster mascot character, holding a latte coffee cup, digital art style.

The lobster should be:
- Friendly and approachable expression
- Red/orange colored shell
- Holding a brown paper coffee cup with latte art on top
- Wearing casual modern clothes (maybe a hoodie or t-shirt)
- Standing in a relaxed pose
- Clean, professional illustration style
- Suitable for a tech/AI assistant mascot

Background: Simple gradient or minimal background
Style: Modern cartoon/illustration, vibrant colors
Mood: Friendly, helpful, energetic

This is for an AI assistant named "Latte Lobster" (小铁)
"""

def generate_image_with_dalle(prompt=PROMPT, size="1024x1024"):
    """使用 DALL-E 3 生成图片"""
    try:
        from openai import OpenAI
        client = OpenAI()
        
        print("🎨 正在生成图片...")
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality="standard",
            n=1,
        )
        
        image_url = response.data[0].url
        print(f"✅ 图片生成成功！")
        print(f"🔗 URL: {image_url}")
        return image_url
        
    except ImportError:
        print("❌ 需要安装 openai 库：pip install openai")
        return None
    except Exception as e:
        print(f"❌ 生成失败：{e}")
        return None

def download_image(url, output_path):
    """下载图片到本地"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ 图片已保存到：{output_path}")
        return output_path
    except Exception as e:
        print(f"❌ 下载失败：{e}")
        return None

def main():
    print("🦞 拿铁小龙虾 AI 生图工具")
    print("=" * 50)
    
    # 创建输出目录
    output_dir = os.path.join(os.path.dirname(__file__), 'avatar')
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成图片
    image_url = generate_image_with_dalle(PROMPT)
    
    if image_url:
        # 下载图片
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f'latte-lobster-{timestamp}.png')
        download_image(image_url, output_path)
        
        # 保存信息
        info = {
            "prompt": PROMPT,
            "image_url": image_url,
            "local_path": output_path,
            "generated_at": datetime.now().isoformat()
        }
        
        info_path = os.path.join(output_dir, f'info-{timestamp}.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        
        print(f"\n📁 输出目录：{output_dir}")
        print(f"📄 信息文件：{info_path}")
    else:
        print("\n❌ 图片生成失败，请检查 API 配置")

if __name__ == "__main__":
    main()
