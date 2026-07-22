# SENTINEL Workspace Rules & Architecture

## Core Architecture
SENTINEL is a multi-modal authenticity and threat detection platform consisting of:
1. **Web3 / Blockchain Module:** Handles decentralized verification and smart contracts. (STATUS: CONSTRUCTED & LOCKED - DO NOT MODIFY).
2. **Vision Engine:** Handles Image and Video deepfake detection using local PyTorch models. (STATUS: CONSTRUCTED & LOCKED - DO NOT MODIFY).
3. **Text Engine:** Handles AI generation detection, harm/risk assessment, and domain classification via LangChain and Cloud LLM APIs.

## Strict Agent Constraints
- **Zero-Touch Policy:** Never modify, refactor, or delete any existing files related to Web3, smart contracts, video processing, or image deepfake detection.
- **Resource Isolation:** Do not attempt to load local PyTorch text transformers (like DeBERTa or RoBERTa) into local memory. All text analysis must be structured as lightweight LangChain API calls to preserve local GPU VRAM for the vision engine.
- **Test-Driven:** Always generate an isolated verification script for any new text pipeline features before attempting to integrate them into the main application routing.