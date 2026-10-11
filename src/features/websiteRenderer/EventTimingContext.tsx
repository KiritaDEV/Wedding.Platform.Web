import { createContext, useContext } from "react";

export type WebsiteEventTiming = { eventDate?: string | null; startTime?: string | null; timeZone?: string | null; startsAtUtc?: string | null };
const EventTimingContext = createContext<WebsiteEventTiming>({});
export const EventTimingProvider = EventTimingContext.Provider;
export const useEventTiming = () => useContext(EventTimingContext);

