from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CollectionTrendItem(BaseModel):
    month: str = Field(..., description="YYYY-MM month label")
    collected: float = Field(..., description="Total reconciled collection amount in INR")
    target: float = Field(..., description="Baseline target amount in INR")
    achievement_percentage: float = Field(..., description="Target achievement percentage")

class CollectionTrendResponse(BaseModel):
    data: List[CollectionTrendItem]
    total_collected_6m: float
    average_monthly: float

class AgingDistributionItem(BaseModel):
    bucket: str = Field(..., description="Current, 0-30 days, 31-60 days, 60+ days")
    bucket_code: str = Field(..., description="CURRENT, BUCKET_1, BUCKET_2, BUCKET_3_PLUS")
    amount: float = Field(..., description="Total outstanding amount in INR")
    count: int = Field(..., description="Number of students in this bucket")
    color: str = Field(..., description="Tailwind/Hex color token")

class AgingDistributionResponse(BaseModel):
    data: List[AgingDistributionItem]
    total_outstanding: float
    total_defaulters: int

class HeatmapCellDetail(BaseModel):
    count: int
    amount: float
    student_ids: List[str]

class ProgramDefaulterHeatmapResponse(BaseModel):
    programs: List[str]
    buckets: List[str]
    matrix: List[List[int]]
    details: Dict[str, HeatmapCellDetail]
