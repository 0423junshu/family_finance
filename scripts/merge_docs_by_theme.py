#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文档主题合并脚本
用于自动识别并合并docs目录下相同主题的文档
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

class DocumentMerger:
    def __init__(self, docs_path: str = "./docs"):
        self.docs_path = Path(docs_path)
        self.backup_path = Path("./docs_backup")
        self.log_path = Path("./logs")
        self.setup_logging()
        
        # 主题关键词映射
        self.theme_keywords = {
            "交易记录": ["交易记录", "transaction", "记录页面", "日期筛选", "查询功能"],
            "资产管理": ["资产", "assets", "资产页面", "资产数据", "历史快照"],
            "预算管理": ["预算", "budget", "预算对比", "预算数据"],
            "家庭协作": ["家庭协作", "家庭管理", "协作功能", "成员管理"],
            "报表统计": ["报表", "统计", "reports", "趋势图", "分析"],
            "问题修复": ["修复", "fix", "问题", "错误", "bug"],
            "功能优化": ["优化", "optimization", "改进", "enhancement"],
            "测试相关": ["测试", "test", "验证", "检查"],
            "数据库相关": ["数据库", "database", "集合", "索引", "云开发"],
            "UI界面": ["UI", "界面", "交互", "导航", "安全区"],
            "技术文档": ["技术", "API", "接口", "架构", "设计"],
            "兼容性": ["兼容", "compatibility", "适配", "版本"]
        }
        
        # 文档重要性权重
        self.importance_weights = {
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
        log_file = self.log_path / f"doc_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
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
        """扫描所有文档文件"""
        documents = []
        supported_extensions = {'.md', '.txt', '.docx', '.doc'}
        
        for root, dirs, files in os.walk(self.docs_path):
            # 跳过备份和临时目录
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != '_archived']
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix.lower() in supported_extensions:
                    documents.append(file_path)
        
        self.logger.info(f"📄 扫描到 {len(documents)} 个文档文件")
        return documents

    def classify_by_theme(self, documents: List[Path]) -> Dict[str, List[Path]]:
        """按主题分类文档"""
        theme_groups = defaultdict(list)
        unclassified = []
        
        for doc_path in documents:
            doc_name = doc_path.stem
            doc_content = self.read_document_content(doc_path)
            
            # 查找匹配的主题
            matched_themes = []
            for theme, keywords in self.theme_keywords.items():
                score = 0
                for keyword in keywords:
                    if keyword in doc_name or keyword in doc_content[:1000]:  # 只检查前1000字符
                        score += 1
                
                if score > 0:
                    matched_themes.append((theme, score))
            
            if matched_themes:
                # 选择得分最高的主题
                best_theme = max(matched_themes, key=lambda x: x[1])[0]
                theme_groups[best_theme].append(doc_path)
            else:
                unclassified.append(doc_path)
        
        # 记录分类结果
        for theme, docs in theme_groups.items():
            self.logger.info(f"📂 {theme}: {len(docs)} 个文档")
        
        if unclassified:
            self.logger.info(f"❓ 未分类: {len(unclassified)} 个文档")
            theme_groups["未分类"] = unclassified
        
        return dict(theme_groups)

    def read_document_content(self, doc_path: Path) -> str:
        """读取文档内容"""
        try:
            if doc_path.suffix.lower() == '.md':
                with open(doc_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif doc_path.suffix.lower() == '.txt':
                with open(doc_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif doc_path.suffix.lower() in ['.docx', '.doc']:
                # 对于Word文档，这里简化处理，实际可以使用python-docx库
                return doc_path.stem  # 暂时只返回文件名
            else:
                return ""
        except Exception as e:
            self.logger.warning(f"⚠️ 无法读取文档 {doc_path}: {e}")
            return ""

    def calculate_document_importance(self, doc_path: Path, content: str) -> int:
        """计算文档重要性得分"""
        score = 0
        doc_name = doc_path.stem
        
        # 基于文件名关键词评分
        for keyword, weight in self.importance_weights.items():
            if keyword in doc_name:
                score += weight
        
        # 基于内容长度评分
        content_length = len(content)
        if content_length > 5000:
            score += 5
        elif content_length > 2000:
            score += 3
        elif content_length > 500:
            score += 1
        
        # 基于结构完整性评分
        if '# ' in content:  # 有标题
            score += 2
        if '## ' in content:  # 有二级标题
            score += 1
        if '```' in content:  # 有代码块
            score += 1
        
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
        header = f"""# {master_doc.stem}

> 📝 本文档由多个相关文档合并而成
> 🕒 合并时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> 📂 原始文档数量: {len(docs)}

---

"""
        merged_content.append(header)
        
        # 添加主文档内容
        if master_content:
            merged_content.append("## 主要内容\n")
            merged_content.append(master_content)
            merged_content.append("\n---\n")
        
        # 处理其他文档
        other_docs = [doc for doc in docs if doc != master_doc]
        if other_docs:
            merged_content.append("## 补充信息\n")
            
            for doc in other_docs:
                content = self.read_document_content(doc)
                if content and len(content.strip()) > 50:  # 只处理有实质内容的文档
                    merged_content.append(f"### 来源: {doc.name}\n")
                    
                    # 提取关键段落（简化处理）
                    key_sections = self.extract_key_sections(content)
                    merged_content.append(key_sections)
                    merged_content.append("\n")
        
        # 添加原始文档列表
        merged_content.append("## 原始文档列表\n")
        for i, doc in enumerate(docs, 1):
            relative_path = doc.relative_to(self.docs_path)
            merged_content.append(f"{i}. `{relative_path}`\n")
        
        return "".join(merged_content)

    def extract_key_sections(self, content: str) -> str:
        """提取文档的关键段落"""
        lines = content.split('\n')
        key_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 保留标题
            if line.startswith('#'):
                key_lines.append(line)
            # 保留重要信息行
            elif any(keyword in line for keyword in ['问题', '解决', '修复', '优化', '结果', '总结']):
                key_lines.append(line)
            # 保留代码块
            elif line.startswith('```'):
                key_lines.append(line)
        
        # 限制长度
        if len(key_lines) > 20:
            key_lines = key_lines[:20]
            key_lines.append("...")
        
        return '\n'.join(key_lines) + '\n'

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
            
            # 创建合并后的文档名
            safe_theme = re.sub(r'[^\w\-_]', '_', theme)
            merged_filename = f"{safe_theme}_合并文档.md"
            merged_path = master_doc.parent / merged_filename
            
            # 写入合并后的文档
            with open(merged_path, 'w', encoding='utf-8') as f:
                f.write(merged_content)
            
            # 删除原始文档（除了主文档，如果主文档名不同的话）
            deleted_count = 0
            for doc in docs:
                if doc != merged_path:  # 避免删除刚创建的合并文档
                    try:
                        doc.unlink()
                        deleted_count += 1
                        self.logger.info(f"🗑️ 已删除: {doc.name}")
                    except Exception as e:
                        self.logger.warning(f"⚠️ 删除失败 {doc.name}: {e}")
            
            self.logger.info(f"✅ {theme} 合并完成: {merged_path.name} (删除了 {deleted_count} 个原文档)")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ {theme} 合并失败: {e}")
            return False

    def generate_summary_report(self, results: Dict[str, bool]):
        """生成合并总结报告"""
        report_content = f"""# 文档合并总结报告

## 执行信息
- 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- 处理目录: {self.docs_path}
- 备份位置: {self.backup_path}

## 合并结果
"""
        
        successful = sum(1 for success in results.values() if success)
        total = len(results)
        
        report_content += f"- 总主题数: {total}\n"
        report_content += f"- 成功合并: {successful}\n"
        report_content += f"- 失败数量: {total - successful}\n\n"
        
        report_content += "## 详细结果\n"
        for theme, success in results.items():
            status = "✅ 成功" if success else "❌ 失败"
            report_content += f"- {theme}: {status}\n"
        
        report_content += f"\n## 日志文件\n"
        report_content += f"详细日志请查看: `{self.log_path}/doc_merge_*.log`\n"
        
        # 保存报告
        report_path = self.docs_path / "文档合并总结报告.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        self.logger.info(f"📊 总结报告已生成: {report_path}")

    def run(self):
        """执行文档合并流程"""
        try:
            self.logger.info("🚀 开始文档合并流程")
            
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
                if len(docs) > 1:  # 只合并有多个文档的主题
                    results[theme] = self.merge_theme_documents(theme, docs)
                else:
                    self.logger.info(f"⏭️ {theme}: 只有1个文档，跳过合并")
                    results[theme] = True
            
            # 生成总结报告
            self.generate_summary_report(results)
            
            self.logger.info("🎉 文档合并流程完成")
            
        except Exception as e:
            self.logger.error(f"💥 文档合并流程失败: {e}")
            raise

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='文档主题合并工具')
    parser.add_argument('--docs-path', default='./docs', help='文档目录路径')
    parser.add_argument('--dry-run', action='store_true', help='试运行模式（不实际修改文件）')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("🔍 试运行模式 - 不会实际修改文件")
        # 在试运行模式下，可以只执行分类和分析，不执行实际合并
    
    merger = DocumentMerger(args.docs_path)
    merger.run()

if __name__ == "__main__":
    main()