#!/usr/bin/env python3
"""
测试状态网站是否正常显示数据
"""
import requests
import json
import re

BASE_URL = "http://localhost:8082"

def test_api():
    """测试 API 端点"""
    print("📡 测试 API 端点...")
    response = requests.get(f"{BASE_URL}/api/status.json")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ API 正常")
        print(f"   - Tasks: {data['today']['tasks']}")
        print(f"   - Uptime: {data['today']['uptime']}s")
        print(f"   - Learning: {[l['percent'] for l in data['learning']]}")
        return data
    else:
        print(f"❌ API 失败：{response.status_code}")
        return None

def test_html():
    """测试 HTML 页面"""
    print("\n🌐 测试 HTML 页面...")
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        print(f"✅ HTML 页面可访问")
        
        # 检查是否包含调试信息
        if 'debugStatus' in response.text:
            print(f"✅ 包含调试元素")
        
        # 检查 JavaScript 代码
        if 'DataManager' in response.text and 'getApiUrl' in response.text:
            print(f"✅ JavaScript 代码已更新")
        
        # 检查缓存控制
        if 'no-cache' in response.text:
            print(f"✅ 缓存控制已配置")
        
        return response.text
    else:
        print(f"❌ HTML 失败：{response.status_code}")
        return None

def test_js_execution():
    """使用 Puppeteer/Playwright 测试实际渲染效果（如果有）"""
    try:
        from playwright.sync_api import sync_playwright
        
        print("\n🎭 使用 Playwright 测试实际渲染...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f"{BASE_URL}/", wait_until='networkidle')
            
            # 等待数据加载
            page.wait_for_timeout(3000)
            
            # 获取渲染后的数据
            tasks = page.query_selector('#tasksToday')
            uptime = page.query_selector('#uptime')
            
            if tasks and uptime:
                tasks_text = tasks.inner_text()
                uptime_text = uptime.inner_text()
                print(f"✅ 渲染结果:")
                print(f"   - Tasks 显示：{tasks_text}")
                print(f"   - Uptime 显示：{uptime_text}")
                
                if tasks_text == '0' or uptime_text == '00:00:00':
                    print(f"❌ 警告：数据显示为 0，JavaScript 可能未执行")
                else:
                    print(f"✅ 数据正常显示")
            
            browser.close()
    except ImportError:
        print("\n⚠️  Playwright 未安装，跳过浏览器渲染测试")
        print("   安装：pip install playwright && playwright install")

def main():
    print("=" * 50)
    print("小铁状态网站测试")
    print("=" * 50)
    
    api_data = test_api()
    test_html()
    
    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)
    
    # 建议
    print("\n💡 建议:")
    print("1. 在浏览器中打开 http://localhost:8082/ 查看实际效果")
    print("2. 按 Ctrl+Shift+I 打开控制台查看 JavaScript 错误")
    print("3. 检查页面是否显示调试信息")

if __name__ == "__main__":
    main()
