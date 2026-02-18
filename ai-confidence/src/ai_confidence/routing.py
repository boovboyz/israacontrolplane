def route(conf: int) -> str:
    if conf >= 80:
        return "stp"
    if conf >= 60:
        return "assist"
    if conf >= 10:
        return "escalate"
    
    return "block"
