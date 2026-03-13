#!/usr/bin/env python3
# 使用阿里云 DashScope 通义万相生成"拿铁小龙虾"形象

import requests
import json
import time
import os

# API Key (从配置文件中获取)
API_KEY = "sk-sp-0e8a4f20a9e9477b9194d22716f066b7"

# 提示词 - 详细描述"拿铁小龙虾"形象
PROMPT = """一只可爱的卡通小龙虾吉祥物，拟人化设计。小龙虾站立着，两只前爪拿着一杯热拿铁咖啡，咖啡杯上有拉花图案。
风格：现代卡通插画风格，色彩鲜艳明亮，线条简洁流畅，可爱 Q 版设计。
背景：简洁的浅色渐变背景，突出主体。
用途：AI 助手吉祥物形象，适合做 logo 和周边。
细节：小龙虾表情友好开心，眼睛大而有神，整体造型圆润可爱，橙红色外壳。"""

def generate_image_with_wanx(prompt=PROMPT):
    """使用通义万相生成图片"""
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable"  # 启用异步生成
    }
    
    payload = {
        "model": "wanx2.1-t2i-turbo",
        "input": {
            "prompt": prompt
        },
        "parameters": {
            "size": "1024*1024",
            "n": 1,
            "style": "<cartoon>",
            "seed": 42
        }
    }
    
    print("🎨 正在调用通义万相 API 生成图片...")
    print(f"提示词：{prompt[:100]}...")
    
    try:
        # 第一步：提交生成任务
        response = requests.post(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        result = response.json()
        print(f"\n提交结果：{json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if response.status_code != 200:
            print(f"❌ 提交失败：{result.get('message', 'Unknown error')}")
            return None
        
        # 获取任务 ID
        task_id = result.get('output', {}).get('task_id')
        if not task_id:
            print("❌ 未获取到任务 ID")
            return None
        
        print(f"\n✅ 任务已提交，任务 ID: {task_id}")
        
        # 第二步：轮询任务状态
        task_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
        
        print("⏳ 等待图片生成中...")
        max_retries = 30  # 最多等待 30 秒 * 10 = 300 秒
        retry_interval = 10  # 每 10 秒检查一次
        
        for i in range(max_retries):
            time.sleep(retry_interval)
            
            task_response = requests.get(task_url, headers=headers, timeout=30)
            task_result = task_response.json()
            
            status = task_result.get('output', {}).get('task_status', 'UNKNOWN')
            print(f"  第 {i+1} 次查询 - 状态：{status}")
            
            if status == 'SUCCEEDED':
                # 生成成功，获取图片 URL
                images = task_result.get('output', {}).get('results', [])
                if images and len(images) > 0:
                    image_url = images[0].get('url')
                    print(f"\n✅ 图片生成成功！")
                    print(f"🔗 URL: {image_url}")
                    return image_url
                else:
                    print("❌ 未找到图片 URL")
                    return None
            elif status in ['FAILED', 'CANCELED']:
                print(f"❌ 任务失败：{task_result.get('message', 'Unknown error')}")
                return None
            # 其他状态：PENDING, RUNNING - 继续等待
        
        print("⏰ 等待超时，图片生成时间过长")
        return None
        
    except Exception as e:
        print(f"❌ 错误：{e}")
        return None

def download_image(url, output_path):
    """下载图片到本地"""
    try:
        print(f"\n📥 正在下载图片...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ 图片已保存到：{output_path}")
        print(f"📊 图片大小：{len(response.content):,} bytes")
        return output_path
    except Exception as e:
        print(f"❌ 下载失败：{e}")
        return None

def main():
    print("=" * 60)
    print("🦞 拿铁小龙虾 AI 生图工具 - 通义万相")
    print("=" * 60)
    print()
    
    # 创建输出目录
    output_dir = "/home/admin/.openclaw/workspace/workspace-status/avatar"
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成图片
    image_url = generate_image_with_wanx(PROMPT)
    
    if image_url:
        # 下载图片
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f'latte-lobster-{timestamp}.png')
        download_image(image_url, output_path)
        
        # 保存信息
        info = {
            "prompt": PROMPT,
            "image_url": image_url,
            "local_path": output_path,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model": "wanx2.1-t2i-turbo",
            "api": "DashScope 通义万相"
        }
        
        info_path = os.path.join(output_dir, f'info-{timestamp}.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        
        print(f"\n📁 输出目录：{output_dir}")
        print(f"📄 信息文件：{info_path}")
        print("\n✅ 完成！")
    else:
        print("\n❌ 图片生成失败，请检查 API 配置或稍后重试")

if __name__ == "__main__":
    main()
