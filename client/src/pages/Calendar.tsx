import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon, Phone, Clock, Users, MoreHorizontal, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";

const EVENT_TYPES = [
  { value: "appointment", label: "Appointment", color: "bg-blue-500" },
  { value: "follow_up", label: "Follow Up", color: "bg-green-500" },
  { value: "call", label: "Call", color: "bg-purple-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [type, setType] = useState<"appointment" | "follow_up" | "call" | "other">("appointment");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: events = [], refetch } = trpc.calendar.list.useQuery({
    startAt: calStart.toISOString(),
    endAt: calEnd.toISOString(),
  });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Event created"); },
    onError: () => toast.error("Failed to create event"),
  });

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Event deleted"); },
    onError: () => toast.error("Failed to delete event"),
  });

  function resetForm() { setTitle(""); setDescription(""); setStartAt(""); setEndAt(""); setType("appointment"); }

  function handleCreate() {
    if (!title.trim() || !startAt || !endAt) return toast.error("Title, start time, and end time are required");
    createMutation.mutate({ title, description, startAt, endAt, type });
  }

  function getEventsForDay(day: Date) {
    return events.filter(e => isSameDay(new Date(e.startAt), day));
  }

  function getTypeConfig(t: string) {
    return EVENT_TYPES.find(et => et.value === t) ?? EVENT_TYPES[3];
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground w-44 text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Event
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 flex-1 border-l border-t border-border">
            {calDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const todayDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`border-r border-b border-border p-2 min-h-[100px] cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-accent/30"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                    todayDay ? "bg-primary text-primary-foreground" : "text-foreground"
                  }`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className={`text-xs px-1.5 py-0.5 rounded text-white truncate ${getTypeConfig(e.type).color}`}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — selected day events */}
        <div className="w-72 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Select a day"}
            </h3>
            {selectedDay && <p className="text-xs text-muted-foreground mt-0.5">{selectedDayEvents.length} events</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <CalendarIcon className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Click a day to see events</p>
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-sm text-muted-foreground">No events on this day</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Event
                </Button>
              </div>
            ) : (
              selectedDayEvents.map(e => {
                const typeConfig = getTypeConfig(e.type);
                return (
                  <Card key={e.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeConfig.color}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{e.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(e.startAt), "h:mm a")} – {format(new Date(e.endAt), "h:mm a")}
                            </p>
                            {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                            <Badge variant="outline" className="text-xs mt-1">{typeConfig.label}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive shrink-0"
                          onClick={() => deleteMutation.mutate({ id: e.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Call with John Smith" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional details…" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
