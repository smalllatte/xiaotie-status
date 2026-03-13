#!/usr/bin/env python3
# 使用 Pollinations.ai 免费生成"拿铁小龙虾"图片（无需 API key）

import requests
import os
import time

# 提示词（英文，因为 Pollinations 对英文支持更好）
PROMPT = "cute cartoon lobster mascot holding a latte coffee cup, modern cartoon illustration style, vibrant colors, kawaii style, friendly expression, simple clean gradient background, AI assistant mascot, digital art, 2D flat design, orange red shell, big expressive eyes"

def generate_image(seed=42):
    """使用 Pollinations.ai 生成图片"""
    
    # 构建 URL
    encoded_prompt = requests.utils.quote(PROMPT)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
    url += f"?width=1024&height=1024&seed={seed}&nologo=true&model=flux"
    
    print(f"🎨 正在生成图片...")
    print(f"提示词：{PROMPT[:100]}...")
    print(f"URL: {url[:150]}...")
    print()
    
    try:
        # 下载图片（Pollinations 直接返回图片数据）
        print("⏳ 等待生成中（最多 60 秒）...")
        response = requests.get(url, timeout=90)
        
        print(f"HTTP 状态：{response.status_code}")
        print(f"响应大小：{len(response.content):,} bytes")
        
        if response.status_code == 200 and len(response.content) > 10000:
            # 验证是否是有效的图片
            if response.content[:4] == b'\x89PNG':
                print("✓ 验证：有效的 PNG 图片")
            elif response.content[:2] == b'\xFF\xD8':
                print("✓ 验证：有效的 JPEG 图片")
            else:
                print("⚠ 未知图片格式")
            
            return response.content
        else:
            print(f"❌ 生成失败")
            print(f"响应预览：{response.text[:300]}")
            return None
            
    except requests.Timeout:
        print("⏰ 请求超时")
        return None
    except Exception as e:
        print(f"❌ 错误：{e}")
        return None

def save_image(image_data, output_dir):
    """保存图片"""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    
    # 检测格式
    if image_data[:4] == b'\x89PNG':
        ext = 'png'
    elif image_data[:2] == b'\xFF\xD8':
        ext = 'jpg'
    else:
        ext = 'png'
    
    output_path = os.path.join(output_dir, f'latte-lobster-{timestamp}.{ext}')
    
    with open(output_path, 'wb') as f:
        f.write(image_data)
    
    print(f"\n✅ 图片已保存到：{output_path}")
    print(f"📊 图片大小：{len(image_data):,} bytes")
    
    return output_path

def main():
    print("=" * 60)
    print("🦞 拿铁小龙虾 AI 生图工具 - Pollinations.ai (免费)")
    print("=" * 60)
    print()
    
    output_dir = "/home/admin/.openclaw/workspace/workspace-status/avatar"
    
    # 尝试多个 seed
    seeds_to_try = [42, 123, 456, 789, 2024]
    
    for i, seed in enumerate(seeds_to_try):
        print(f"\n尝试第 {i+1} 个种子 (seed={seed})...")
        print("-" * 60)
        
        image_data = generate_image(seed)
        
        if image_data:
            output_path = save_image(image_data, output_dir)
            
            # 保存信息
            info = {
                "prompt": PROMPT,
                "local_path": output_path,
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "model": "Pollinations.ai (Flux)",
                "seed": seed,
                "api": "免费，无需 API key"
            }
            
            info_path = output_path.replace('.png', '.json').replace('.jpg', '.json')
            with open(info_path, 'w', encoding='utf-8') as f:
                import json
                json.dump(info, f, ensure_ascii=False, indent=2)
            
            print(f"\n📄 信息文件：{info_path}")
            print("\n✅ 完成！")
            return
        else:
            print(f"第 {i+1} 次尝试失败，继续...")
    
    print("\n❌ 所有尝试都失败了")

if __name__ == "__main__":
    main()
