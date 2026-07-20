import os
from pydantic import Field, AnyUrl, validator
from pydantic_settings import BaseSettings
from typing import Optional
from enum import IntEnum

class VerificationStatus(IntEnum):
    PENDING = 0
    VERIFIED = 1
    FLAGGED = 2

class Settings(BaseSettings):
    """
    Core Configuration Settings for the Sentinel FastAPI Orchestrator.
    These settings are strictly synced with the Node.js Relayer parameters.
    """
    
    # Server Settings
    FASTAPI_PORT: int = Field(default=8000, description="Port for the FastAPI application")
    NODE_RELAYER_PORT: int = Field(default=3000, description="Port of the Node.js Relayer service")
    
    # Web3 Settings
    NETWORK_RPC_URL: AnyUrl = Field(
        ..., 
        description="RPC URL for the Sepolia Testnet (e.g., Alchemy or Infura)"
    )
    CONTRACT_ADDRESS: str = Field(
        default="0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9", 
        description="Deployed address of the SentinelRegistry contract"
    )
    
    # System Logic Settings
    TRUST_SCORE_THRESHOLD: int = Field(
        default=80, 
        description="Minimum trust score threshold for automatic content verification"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @validator("CONTRACT_ADDRESS")
    def validate_ethereum_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("CONTRACT_ADDRESS must be a valid 42-character Ethereum address starting with 0x.")
        return v

# Instantiate settings globally for FastAPI ingestion
settings = Settings()
