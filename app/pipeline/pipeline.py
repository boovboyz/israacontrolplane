import logging
import time
from typing import Any, List, Optional
from datetime import datetime
from dataclasses import asdict

from app.pipeline.interfaces import PipelineContext, PipelineStep, StepResult

logger = logging.getLogger(__name__)

class Pipeline:
    """
    Orchestrates the execution of a sequence of PipelineSteps.
    """
    def __init__(self, name: str, steps: List[PipelineStep]):
        self.name = name
        self.steps = steps

    def run(self, initial_input: Any, context: Optional[PipelineContext] = None) -> StepResult:
        """
        Run all steps strictly sequentially.
        
        Args:
            initial_input: The starting input for the first step.
            context: An existing context or None (will create default).
            
        Returns:
            The StepResult of the final step, or the failed step result.
        """
        if context is None:
            context = PipelineContext()
        
        current_input = initial_input
        logger.info(f"Starting pipeline '{self.name}' with {len(self.steps)} steps. Request ID: {context.request_id}")
        
        pipeline_start_time = time.time()
        final_result = None

        for step in self.steps:
            step_start = time.time()
            try:
                logger.debug(f"Running step: {step.name}")
                result = step.run(context, current_input)
                
                duration = time.time() - step_start
                
                # Record step telemetry into context metadata (for observability)
                # We append to a list of step_runs to keep history
                if "step_runs" not in context.metadata:
                    context.metadata["step_runs"] = []
                
                context.metadata["step_runs"].append({
                    "step_name": step.name,
                    "duration_seconds": duration,
                    "success": result.success,
                    "metadata": result.metadata,
                    "errors": result.errors
                })

                if not result.success:
                    logger.error(f"Step '{step.name}' failed: {result.errors}")
                    # Stop pipeline on failure
                    final_result = result
                    break
                
                # Pass output to next step
                current_input = result.output
                final_result = result

            except Exception as e:
                logger.exception(f"Unhandled exception in step '{step.name}'")
                error_result = StepResult(
                    output=None,
                    success=False,
                    errors=[str(e)],
                    metadata={"exception_type": type(e).__name__}
                )
                
                # Log failure
                if "step_runs" not in context.metadata:
                    context.metadata["step_runs"] = []
                    
                context.metadata["step_runs"].append({
                    "step_name": step.name,
                    "duration_seconds": time.time() - step_start,
                    "success": False,
                    "errors": [str(e)],
                    "exception": str(e)
                })
                
                final_result = error_result
                break

        pipeline_duration = time.time() - pipeline_start_time
        context.metadata["pipeline_duration_seconds"] = pipeline_duration
        
        if final_result and final_result.success:
            logger.info(f"Pipeline '{self.name}' completed successfully in {pipeline_duration:.2f}s")
        else:
            logger.warning(f"Pipeline '{self.name}' failed or incomplete in {pipeline_duration:.2f}s")

        return final_result or StepResult(output=None, success=False, errors=["No steps executed"])
