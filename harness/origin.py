"""Developer origin of each served model (headquarters of the organisation that released it). Metadata, not results."""
ORIGIN = {"Qwen": "CN", "deepseek-ai": "CN", "moonshotai": "CN", "zai-org": "CN", "MiniMaxAI": "CN",
          "openai": "US", "nvidia": "US", "NousResearch": "US", "google": "US", "meta-models": "US"}


def origin(model: str) -> str:
    return ORIGIN[model.split("/")[0]]


def short(model: str) -> str:
    """Display name: drop the provider and release suffixes."""
    name = model.split("/")[-1]
    for cut in ("-Instruct-2507", "-A22B", "-A3B", "-it", "-a12b"):
        name = name.replace(cut, "")
    return {"nemotron-3-super-120b": "Nemotron-3-Super", "NVIDIA-Nemotron-3-Nano-30B": "Nemotron-3-Nano",
            "Nemotron-3-Ultra-550b-a55b": "Nemotron-3-Ultra"}.get(name, name)


# Family and size order (small -> large within a family) for the panel figure; from the model names and model cards.
FAMILY = {
    "Qwen/Qwen3-30B-A3B-Instruct-2507": ("Qwen3", 1), "Qwen/Qwen3-235B-A22B-Instruct-2507": ("Qwen3", 2),
    "Qwen/Qwen3.8-27B": ("Qwen3.8", 1),
    "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B": ("Nemotron-3", 1), "nvidia/nemotron-3-super-120b-a12b": ("Nemotron-3", 2),
    "nvidia/Nemotron-3-Ultra-550b-a55b": ("Nemotron-3", 3),
    "MiniMaxAI/MiniMax-M3.1-Flash": ("MiniMax", 1), "MiniMaxAI/MiniMax-M3": ("MiniMax", 2),
    "zai-org/GLM-5.3-Flash": ("GLM-5.3", 1), "zai-org/GLM-5.3": ("GLM-5.3", 2),
    "deepseek-ai/DeepSeek-V4.1-Flash": ("DeepSeek", 1), "deepseek-ai/DeepSeek-V4-Pro": ("DeepSeek", 2),
}


def family(model: str) -> tuple[str, int]:
    """(family, size rank); models without a size ladder are their own family."""
    return FAMILY.get(model, (short(model), 1))
