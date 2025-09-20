# 修复 ESLint 注释与记录性文档被扫描导致报错

## Core Features

- 删除 docs/config/.eslintrc.js，保留 .example.js

- project.config.json 忽略 docs*/logs/.git

- 根 ESLint 忽略规则生效（__*__/donutAuthorize__/scripts/__pycache__）

## Tech Stack

{
  "Web": {
    "arch": "html",
    "component": null
  },
  "iOS": "",
  "Android": ""
}

## Design

通过 ignore + 删除记录性 .js + 示例文件方式，彻底避免记录性目录被扫描；等待用户提供编译错误堆栈以继续。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] step1_read_and_identify_issue

[X] step2_fix_docs_config_eslintrc

[/] step3_validate_in_devtools

[X] step4_align_root_eslint_headers_if_needed

[ ] step5_handle_devtools_baseLib_compat

[X] step6_exclude_doc_dirs_in_project_config

[X] step7_rename_or_remove_template_js_in_docs
