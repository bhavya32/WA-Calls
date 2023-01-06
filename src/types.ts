export type call_event = {
    event: "offer" | "connected" | "terminated",
    from: string,
    type: "audio" | "video"
}