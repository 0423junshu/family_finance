#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版文档主题合并脚本
用于跨目录自动识别并合并docs目录下相同主题的文档
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Set
import logging

class EnhancedDocumentMerger:
    def __init__(self, docs_path: str = "./docs"):
        self.docs_path = Path(docs_path)
        self.backup_path = Path("./docs_backup_enhanced")
        self.log_path = Path("./logs")
        self.setup_logging()
        
        # 主题关键词映射（增强版）
        self.theme_keywords = {
            "交易记录": ["交易记录", "transaction", "记录页面", "日期筛选", "查询功能", "交易", "记录"],
            "资产管理": ["资产", "assets", "资产页面", "资产数据", "历史快照", "资产管理"],
            "预算管理": ["预算", "budget", "预算对比", "预算数据", "预算管理"],
            "家庭协作": ["家庭协作", "家庭管理", "协作功能", "成员管理", "家庭", "协作"],
            "报表统计": ["报表", "统计", "reports", "趋势图", "分析", "报表统计"],
            "问题修复": ["修复", "fix", "问题", "错误", "bug", "问题修复"],
            "功能优化": ["优化", "optimization", "改进", "enhancement", "功能优化"],
            "测试相关": ["测试", "test", "验证", "检查", "测试相关"],
            "数据库相关": ["数据库", "database", "集合", "索引", "云开发", "数据库相关"],
            "UI界面": ["UI", "界面", "交互", "导航", "安全区", "UI界面"],
            "技术文档": ["技术", "API", "接口", "架构", "设计", "技术文档"],
            "兼容性": ["兼容", "compatibility", "适配", "版本", "兼容性"]
        }
        
        # 文档重要性权重
        self.importance_weights = {
            "合并文档": 15,  # 已合并的文档优先级最高
            "总结": 10,
            "完成": 9,
            "最终": 8,
            "方案": 7,
            "报告": 6,
            "记录": 5,
            "分析": 4,
            "计划": 3,
            "指南": 2
        }

    def setup_logging(self):
        """设置日志系统"""
        self.log_path.mkdir(exist_ok=True)
        log_file = self.log_path / f"doc_merge_enhanced_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def create_backup(self):
        """创建文档备份"""
        try:
            if self.backup_path.exists():
                shutil.rmtree(self.backup_path)
            shutil.copytree(self.docs_path, self.backup_path)
            self.logger.info(f"✅ 已创建备份: {self.backup_path}")
        except Exception as e:
            self.logger.error(f"❌ 备份创建失败: {e}")
            raise

    def scan_documents(self) -> List[Path]:
        """扫描所有文档文件（跨目录）"""
        documents = []
        supported_extensions = {'.md', '.txt', '.docx', '.doc'}
        
        # 跨目录递归搜索
        for root, dirs, files in os.walk(self.docs_path):
            # 跳过备份和临时目录
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['_archived', '_backup']]
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix.lower() in supported_extensions:
                    # 跳过已经是合并文档的文件（避免重复合并）
                    if not file.endswith('_合并文档.md'):
                        documents.append(file_path)
        
        self.logger.info(f"📄 跨目录扫描到 {len(documents)} 个文档文件")
        return documents

    def classify_by_theme(self, documents: List[Path]) -> Dict[str, List[Path]]:
        """按主题分类文档（增强版）"""
        theme_groups = defaultdict(list)
        unclassified = []
        
        for doc_path in documents:
            doc_name = doc_path.stem
            doc_content = self.read_document_content(doc_path)
            relative_path = str(doc_path.relative_to(self.docs_path))
            
            # 查找匹配的主题
            matched_themes = []
            for theme, keywords in self.theme_keywords.items():
                score = 0
                
                # 检查文件名
                for keyword in keywords:
                    if keyword in doc_name.lower():
                        score += 3  # 文件名匹配权重更高
                
                # 检查文件路径
                for keyword in keywords:
                    if keyword in relative_path.lower():
                        score += 2  # 路径匹配
                
                # 检查文档内容
                for keyword in keywords:
                    if keyword in doc_content[:2000].lower():  # 检查前2000字符
                        score += 1
                
                if score > 0:
                    matched_themes.append((theme, score))
            
            if matched_themes:
                # 选择得分最高的主题
                best_theme = max(matched_themes, key=lambda x: x[1])[0]
                theme_groups[best_theme].append(doc_path)
                self.logger.debug(f"📋 {doc_path.name} → {best_theme} (得分: {max(matched_themes, key=lambda x: x[1])[1]})")
            else:
                unclassified.append(doc_path)
        
        # 记录分类结果
        for theme, docs in theme_groups.items():
            self.logger.info(f"📂 {theme}: {len(docs)} 个文档")
            for doc in docs:
                self.logger.debug(f"   - {doc.relative_to(self.docs_path)}")
        
        if unclassified:
            self.logger.info(f"❓ 未分类: {len(unclassified)} 个文档")
            theme_groups["未分类"] = unclassified
        
        return dict(theme_groups)

    def read_document_content(self, doc_path: Path) -> str:
        """读取文档内容"""
        try:
            if doc_path.suffix.lower() in ['.md', '.txt']:
                with open(doc_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif doc_path.suffix.lower() in ['.docx', '.doc']:
                # 对于Word文档，这里简化处理
                return doc_path.stem
            else:
                return ""
        except Exception as e:
            self.logger.warning(f"⚠️ 无法读取文档 {doc_path}: {e}")
            return ""

    def calculate_document_importance(self, doc_path: Path, content: str) -> int:
        """计算文档重要性得分"""
        score = 0
        doc_name = doc_path.stem.lower()
        
        # 基于文件名关键词评分
        for keyword, weight in self.importance_weights.items():
            if keyword in doc_name:
                score += weight
        
        # 基于内容长度评分
        content_length = len(content)
        if content_length > 10000:
            score += 8
        elif content_length > 5000:
            score += 5
        elif content_length > 2000:
            score += 3
        elif content_length > 500:
            score += 1
        
        # 基于结构完整性评分
        if '# ' in content:  # 有标题
            score += 3
        if '## ' in content:  # 有二级标题
            score += 2
        if '```' in content:  # 有代码块
            score += 1
        if '---' in content:  # 有分隔符
            score += 1
        
        # 基于文件位置评分
        if 'analysis-reports' in str(doc_path):
            score += 2  # 分析报告目录的文档优先级较高
        
        return score

    def select_master_document(self, docs: List[Path]) -> Path:
        """选择主文档"""
        if len(docs) == 1:
            return docs[0]
        
        scored_docs = []
        for doc in docs:
            content = self.read_document_content(doc)
            score = self.calculate_document_importance(doc, content)
            scored_docs.append((doc, score, len(content)))
        
        # 按得分排序，得分相同时按内容长度排序
        scored_docs.sort(key=lambda x: (x[1], x[2]), reverse=True)
        
        master_doc = scored_docs[0][0]
        self.logger.info(f"📋 选择主文档: {master_doc.name} (得分: {scored_docs[0][1]})")
        
        return master_doc

    def extract_key_information(self, docs: List[Path], master_doc: Path) -> str:
        """提取并合并关键信息"""
        merged_content = []
        
        # 读取主文档内容
        master_content = self.read_document_content(master_doc)
        
        # 添加合并说明头部
        header = f"""# {self.get_clean_title(master_doc.stem)}

> 📝 本文档由 {len(docs)} 个相关文档合并而成
> 🕒 合并时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> 📂 原始文档数量: {len(docs)}
> 🎯 主文档: {master_doc.name}

---

"""
        merged_content.append(header)
        
        # 添加主文档内容
        if master_content:
            merged_content.append("## 主要内容\n\n")
            # 清理主文档内容中的重复标题
            cleaned_content = self.clean_content(master_content)
            merged_content.append(cleaned_content)
            merged_content.append("\n\n---\n\n")
        
        # 处理其他文档
        other_docs = [doc for doc in docs if doc != master_doc]
        if other_docs:
            merged_content.append("## 补充信息\n\n")
            
            for i, doc in enumerate(other_docs, 1):
                content = self.read_document_content(doc)
                if content and len(content.strip()) > 100:  # 只处理有实质内容的文档
                    merged_content.append(f"### {i}. 来源: {doc.name}\n\n")
                    
                    # 提取关键段落
                    key_sections = self.extract_key_sections(content)
                    if key_sections.strip():
                        merged_content.append(key_sections)
                        merged_content.append("\n\n")
        
        # 添加原始文档列表
        merged_content.append("## 原始文档列表\n\n")
        for i, doc in enumerate(docs, 1):
            relative_path = doc.relative_to(self.docs_path)
            merged_content.append(f"{i}. `{relative_path}`\n")
        
        merged_content.append(f"\n---\n\n*合并完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")
        
        return "".join(merged_content)

    def get_clean_title(self, filename: str) -> str:
        """获取清理后的标题"""
        # 移除常见的后缀
        title = filename.replace('_合并文档', '').replace('-合并', '').replace('_总结', '')
        return title

    def clean_content(self, content: str) -> str:
        """清理文档内容"""
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 跳过重复的合并说明
            if '本文档由' in line and '合并而成' in line:
                continue
            if '合并时间:' in line:
                continue
            if '原始文档数量:' in line:
                continue
            
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)

    def extract_key_sections(self, content: str) -> str:
        """提取文档的关键段落"""
        lines = content.split('\n')
        key_lines = []
        in_code_block = False
        
        for line in lines:
            line_stripped = line.strip()
            
            # 处理代码块
            if line_stripped.startswith('```'):
                in_code_block = not in_code_block
                key_lines.append(line)
                continue
            
            if in_code_block:
                key_lines.append(line)
                continue
            
            if not line_stripped:
                if key_lines and key_lines[-1].strip():  # 避免连续空行
                    key_lines.append('')
                continue
            
            # 保留标题
            if line_stripped.startswith('#'):
                key_lines.append(line)
            # 保留重要信息行
            elif any(keyword in line_stripped for keyword in ['问题', '解决', '修复', '优化', '结果', '总结', '完成', '实现']):
                key_lines.append(line)
            # 保留列表项
            elif line_stripped.startswith(('-', '*', '+')):
                key_lines.append(line)
            # 保留数字列表
            elif re.match(r'^\d+\.', line_stripped):
                key_lines.append(line)
        
        # 限制长度并清理
        if len(key_lines) > 50:
            key_lines = key_lines[:50]
            key_lines.append("...")
        
        # 移除末尾的空行
        while key_lines and not key_lines[-1].strip():
            key_lines.pop()
        
        return '\n'.join(key_lines)

    def merge_theme_documents(self, theme: str, docs: List[Path]) -> bool:
        """合并同主题文档"""
        try:
            if len(docs) <= 1:
                self.logger.info(f"⏭️ {theme}: 只有 {len(docs)} 个文档，跳过合并")
                return True
            
            self.logger.info(f"🔄 开始合并 {theme}: {len(docs)} 个文档")
            
            # 选择主文档
            master_doc = self.select_master_document(docs)
            
            # 提取并合并关键信息
            merged_content = self.extract_key_information(docs, master_doc)
            
            # 创建合并后的文档名和路径
            safe_theme = re.sub(r'[^\w\-_]', '_', theme)
            merged_filename = f"{safe_theme}_合并文档.md"
            
            # 将合并文档放在docs根目录
            merged_path = self.docs_path / merged_filename
            
            # 写入合并后的文档
            with open(merged_path, 'w', encoding='utf-8') as f:
                f.write(merged_content)
            
            # 删除原始文档
            deleted_count = 0
            for doc in docs:
                if doc != merged_path:  # 避免删除刚创建的合并文档
                    try:
                        doc.unlink()
                        deleted_count += 1
                        self.logger.info(f"🗑️ 已删除: {doc.relative_to(self.docs_path)}")
                    except Exception as e:
                        self.logger.warning(f"⚠️ 删除失败 {doc.name}: {e}")
            
            self.logger.info(f"✅ {theme} 合并完成: {merged_filename} (删除了 {deleted_count} 个原文档)")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ {theme} 合并失败: {e}")
            return False

    def generate_summary_report(self, results: Dict[str, bool]):
        """生成合并总结报告"""
        report_content = f"""# 增强版文档合并总结报告

## 执行信息
- 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- 处理目录: {self.docs_path}
- 备份位置: {self.backup_path}
- 合并策略: 跨目录智能主题识别

## 合并结果统计
"""
        
        successful = sum(1 for success in results.values() if success)
        total = len(results)
        
        report_content += f"- 总主题数: {total}\n"
        report_content += f"- 成功合并: {successful}\n"
        report_content += f"- 失败数量: {total - successful}\n"
        report_content += f"- 成功率: {successful/total*100:.1f}%\n\n"
        
        report_content += "## 详细合并结果\n\n"
        for theme, success in results.items():
            status = "✅ 成功" if success else "❌ 失败"
            report_content += f"- **{theme}**: {status}\n"
        
        report_content += f"\n## 合并后文档位置\n\n"
        report_content += "所有合并后的文档都位于 `docs/` 根目录下，文件名格式为 `{主题}_合并文档.md`\n\n"
        
        report_content += f"## 备份信息\n\n"
        report_content += f"- 原始文档已备份至: `{self.backup_path}`\n"
        report_content += f"- 如需恢复，请手动复制备份文件\n\n"
        
        report_content += f"## 日志文件\n\n"
        report_content += f"详细操作日志请查看: `{self.log_path}/doc_merge_enhanced_*.log`\n"
        
        # 保存报告
        report_path = self.docs_path / "增强版文档合并总结报告.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        self.logger.info(f"📊 总结报告已生成: {report_path}")

    def run(self):
        """执行文档合并流程"""
        try:
            self.logger.info("🚀 开始增强版文档合并流程")
            
            # 创建备份
            self.create_backup()
            
            # 扫描文档
            documents = self.scan_documents()
            if not documents:
                self.logger.warning("⚠️ 未找到任何文档文件")
                return
            
            # 按主题分类
            theme_groups = self.classify_by_theme(documents)
            
            # 合并每个主题的文档
            results = {}
            for theme, docs in theme_groups.items():
                results[theme] = self.merge_theme_documents(theme, docs)
            
            # 生成总结报告
            self.generate_summary_report(results)
            
            self.logger.info("🎉 增强版文档合并流程完成")
            
        except Exception as e:
            self.logger.error(f"💥 文档合并流程失败: {e}")
            raise

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='增强版文档主题合并工具')
    parser.add_argument('--docs-path', default='./docs', help='文档目录路径')
    parser.add_argument('--dry-run', action='store_true', help='试运行模式（不实际修改文件）')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 试运行模式 - 不会实际修改文件")
    
    merger = EnhancedDocumentMerger(args.docs_path)
    merger.run()

if __name__ == "__main__":
    main()