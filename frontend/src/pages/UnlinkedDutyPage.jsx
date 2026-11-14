import {
  AlertCircle,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBuses } from "../services/busService";
import { getCrew } from "../services/crewService";
import { getDuties } from "../services/dutyService";
import {
  createHandover,
  createUnlinkedSchedule,
  getAvailableCrew,
  getCrewAvailabilityCalendar,
  getHandovers,
  getRestConfiguration,
  getUnlinkedSchedules
} from "../services/unlinkedDutyService";

const SECTIONS = [
  ["schedules", "Unlinked schedules"],
  ["handover", "Crew handover"],
  ["rest", "Rest management"],
  ["calendar", "Availability calendar"],
  ["history", "Handover history"]
];

function getIndiaDateTime(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`
  };
}

function isoWithIndiaOffset(date, time) {
  return `${date}T${time}:00+05:30`;
}

function displayDate(value) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function displayTime(value) {
  return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function crewLabel(member) {
  return `${member.name} · ${member.crewId || member.badgeNumber || member.id}`;
}

export default function UnlinkedDutyPage() {
  const initialTime = getIndiaDateTime(30);
  const [section, setSection] = useState("schedules");
  const [schedules, setSchedules] = useState([]);
  const [duties, setDuties] = useState([]);
  const [buses, setBuses] = useState([]);
  const [crew, setCrew] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [calendar, setCalendar] = useState({ assignments: [], restPeriods: [] });
  const [handovers, setHandovers] = useState([]);
  const [restMinutes, setRestMinutes] = useState(480);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    busId: "",
    shiftDate: initialTime.date,
    startTime: initialTime.time,
    endTime: "14:00",
    driverId: "",
    conductorId: "",
    depot: ""
  });
  const [handoverForm, setHandoverForm] = useState({
    previousDutyId: "",
    shiftDate: initialTime.date,
    startTime: initialTime.time,
    endTime: "14:00",
    newDriverId: "",
    newConductorId: ""
  });
  const [calendarStart, setCalendarStart] = useState(getIndiaDateTime().date);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const endDate = new Date(`${calendarStart}T12:00:00+05:30`);
      endDate.setDate(endDate.getDate() + 6);
      const end = getIndiaDateTime(endDate.getTime() - Date.now()).date;
      const [scheduleResult, dutyResult, busResult, crewResult, handoverResult, restConfig, calendarResult] = await Promise.all([
        getUnlinkedSchedules(),
        getDuties({ page: 1, limit: 100 }),
        getBuses({ page: 1, limit: 100 }),
        getCrew({ page: 1, limit: 100 }),
        getHandovers({ limit: 100 }),
        getRestConfiguration(),
        getCrewAvailabilityCalendar({ startDate: calendarStart, endDate: end })
      ]);
      setSchedules(scheduleResult.data || []);
      setDuties(dutyResult.data || []);
      setBuses(busResult.data || []);
      setCrew(crewResult.data || []);
      setHandovers(handoverResult.data || []);
      setRestMinutes(restConfig.requiredRestDurationMinutes);
      setCalendar(calendarResult.data || { assignments: [], restPeriods: [] });
      setScheduleForm((previous) => ({
        ...previous,
        busId: previous.busId || busResult.data?.[0]?.id || ""
      }));
      setHandoverForm((previous) => ({
        ...previous,
        previousDutyId: previous.previousDutyId || dutyResult.data?.find((duty) => ["Active", "Completed"].includes(duty.status))?.id || ""
      }));
    } catch (requestError) {
      setError(requestError.message || "Unable to load scheduling data.");
    } finally {
      setIsLoading(false);
    }
  }, [calendarStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availabilityAt = section === "handover" ? handoverForm : scheduleForm;
  const refreshAvailability = useCallback(async () => {
    if (!availabilityAt.shiftDate || !availabilityAt.startTime) return;
    try {
      const result = await getAvailableCrew({
        at: isoWithIndiaOffset(availabilityAt.shiftDate, availabilityAt.startTime),
        includeAll: "true"
      });
      setAvailability(result.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to check crew availability.");
    }
  }, [availabilityAt.shiftDate, availabilityAt.startTime]);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  const drivers = useMemo(() => availability.filter((member) => member.role === "Driver" && member.status === "Available"), [availability]);
  const conductors = useMemo(() => availability.filter((member) => member.role === "Conductor" && member.status === "Available"), [availability]);
  const activeAssignments = useMemo(
    () => duties.filter((duty) => ["Active", "Completed"].includes(duty.status) && duty.assignment),
    [duties]
  );
  const currentDuties = useMemo(
    () => duties.filter((duty) => ["Scheduled", "Active"].includes(duty.status) && duty.assignment),
    [duties]
  );

  async function submitSchedule(event) {
    event.preventDefault();
    if (!window.confirm("Create this unlinked bus duty with the selected driver and conductor?")) return;
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      await createUnlinkedSchedule({
        ...scheduleForm,
        dutyNumber: undefined,
        depot: scheduleForm.depot || undefined
      });
      setNotice("Unlinked duty scheduled successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Unable to create the duty.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitHandover(event) {
    event.preventDefault();
    const previousDuty = activeAssignments.find((duty) => duty.id === handoverForm.previousDutyId);
    if (!previousDuty) {
      setError("Select an active or completed duty with an assigned bus and crew.");
      return;
    }
    const driver = crew.find((member) => member.id === handoverForm.newDriverId);
    const conductor = crew.find((member) => member.id === handoverForm.newConductorId);
    const confirmed = window.confirm(
      `Transfer bus ${previousDuty.assignment.bus?.busNumber || ""} from ${previousDuty.assignment.driver?.name || "current driver"} and ${previousDuty.assignment.conductor?.name || "current conductor"} to ${driver?.name || "the selected driver"} and ${conductor?.name || "the selected conductor"}?`
    );
    if (!confirmed) return;
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      await createHandover(handoverForm);
      setNotice("Bus handover completed and recorded.");
      await loadData();
    } catch (requestError) {
      const details = requestError.response?.data?.earliestAvailableAt;
      setError(`${requestError.response?.data?.error || requestError.message}${details ? ` Earliest available: ${displayDate(details)}.` : ""}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeSectionName = SECTIONS.find(([id]) => id === section)?.[1];
  const crewStatus = (member) => availability.find((item) => item.id === member.id)?.status || member.status || "Not Available";

  return (
    <section className="page-wrap unlinked-page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">CHUNK 7 · CREW OPERATIONS</div>
          <h1>Unlinked Duty &amp; Rest Management</h1>
          <p>Reassign bus crews safely with live availability and mandatory rest validation.</p>
        </div>
        <button className="button button-outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      <div className="unlinked-summary">
        <article><span><CalendarDays size={17} /></span><strong>{schedules.length}</strong><small>Unlinked duties</small></article>
        <article><span><Users size={17} /></span><strong>{crew.length}</strong><small>Active crew records</small></article>
        <article><span><Clock3 size={17} /></span><strong>{restMinutes} min</strong><small>Required rest period</small></article>
        <article><span><ArrowRightLeft size={17} /></span><strong>{handovers.length}</strong><small>Recent handovers</small></article>
      </div>

      <nav className="unlinked-tabs" aria-label="Duty and crew sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={section === id ? "selected" : ""} onClick={() => setSection(id)}>{label}</button>
        ))}
      </nav>

      {error && <div className="unlinked-alert error" role="alert"><AlertCircle size={17} />{error}</div>}
      {notice && <div className="unlinked-alert success" role="status"><CheckCircle2 size={17} />{notice}</div>}
      {isLoading ? <div className="loading-box"><span className="spinner" />Loading crew and schedule data…</div> : (
        <div className="unlinked-panel">
          <div className="unlinked-panel-heading">
            <div><h2>{activeSectionName}</h2><p>All assignments and availability are loaded from the administration API.</p></div>
            <ShieldCheck size={20} />
          </div>

          {section === "schedules" && (
            <div className="unlinked-two-column">
              <form className="unlinked-form" onSubmit={submitSchedule}>
                <h3>Create an unlinked duty</h3>
                <label>Bus<select required value={scheduleForm.busId} onChange={(event) => setScheduleForm({ ...scheduleForm, busId: event.target.value })}>
                  <option value="">Select a bus</option>
                  {buses.filter((bus) => ["Active", "Available"].includes(bus.status)).map((bus) => <option key={bus.id} value={bus.id}>{bus.busNumber} · {bus.status}</option>)}
                </select></label>
                <div className="unlinked-field-row">
                  <label>Duty date<input required type="date" value={scheduleForm.shiftDate} onChange={(event) => setScheduleForm({ ...scheduleForm, shiftDate: event.target.value })} /></label>
                  <label>Start time<input required type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })} /></label>
                  <label>End time<input required type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm({ ...scheduleForm, endTime: event.target.value })} /></label>
                </div>
                <label>Driver<select required value={scheduleForm.driverId} onChange={(event) => setScheduleForm({ ...scheduleForm, driverId: event.target.value })}>
                  <option value="">Select an available driver</option>
                  {drivers.map((member) => <option key={member.id} value={member.id}>{crewLabel(member)}</option>)}
                </select></label>
                <label>Conductor<select required value={scheduleForm.conductorId} onChange={(event) => setScheduleForm({ ...scheduleForm, conductorId: event.target.value })}>
                  <option value="">Select an available conductor</option>
                  {conductors.map((member) => <option key={member.id} value={member.id}>{crewLabel(member)}</option>)}
                </select></label>
                <button className="button button-primary" disabled={isSubmitting || !drivers.length || !conductors.length}>
                  {isSubmitting ? "Saving assignment…" : "Create duty"}
                </button>
                {(!drivers.length || !conductors.length) && <small className="unlinked-help">No crew member is available for this start time and required rest period.</small>}
              </form>
              <section className="unlinked-table-wrap">
                <h3>Current bus assignments</h3>
                {currentDuties.length ? <div className="unlinked-table-scroll"><table className="unlinked-table">
                  <thead><tr><th>Bus / Route</th><th>Driver &amp; conductor</th><th>Duty time</th><th>Status</th></tr></thead>
                  <tbody>{currentDuties.map((duty) => <tr key={duty.id}>
                    <td><strong>{duty.assignment.bus?.busNumber || "—"}</strong><small>{duty.shiftDate}</small></td>
                    <td>{duty.assignment.driver?.name || "—"}<small>{duty.assignment.conductor?.name || "—"}</small></td>
                    <td>{duty.startTime?.slice(0, 5)}–{duty.endTime?.slice(0, 5)}</td>
                    <td><span className={`crew-status status-${duty.status.toLowerCase()}`}>{duty.status}</span></td>
                  </tr>)}</tbody>
                </table></div> : <div className="unlinked-empty">No current bus assignments found.</div>}
              </section>
            </div>
          )}

          {section === "handover" && (
            <div className="unlinked-two-column">
              <form className="unlinked-form" onSubmit={submitHandover}>
                <h3>Transfer a bus duty</h3>
                <label>Previous duty<select required value={handoverForm.previousDutyId} onChange={(event) => setHandoverForm({ ...handoverForm, previousDutyId: event.target.value })}>
                  <option value="">Select a completed trip duty</option>
                  {activeAssignments.map((duty) => <option key={duty.id} value={duty.id}>{duty.dutyNumber} · {duty.assignment.bus?.busNumber} · {duty.status}</option>)}
                </select></label>
                <div className="unlinked-current-crew">
                  {activeAssignments.find((duty) => duty.id === handoverForm.previousDutyId)?.assignment && (() => {
                    const assignment = activeAssignments.find((duty) => duty.id === handoverForm.previousDutyId).assignment;
                    return <><span>Current crew</span><strong>{assignment.driver?.name} + {assignment.conductor?.name}</strong><small>Bus {assignment.bus?.busNumber}</small></>;
                  })()}
                </div>
                <div className="unlinked-field-row">
                  <label>Next duty date<input required type="date" value={handoverForm.shiftDate} onChange={(event) => setHandoverForm({ ...handoverForm, shiftDate: event.target.value })} /></label>
                  <label>Start time<input required type="time" value={handoverForm.startTime} onChange={(event) => setHandoverForm({ ...handoverForm, startTime: event.target.value })} /></label>
                  <label>End time<input required type="time" value={handoverForm.endTime} onChange={(event) => setHandoverForm({ ...handoverForm, endTime: event.target.value })} /></label>
                </div>
                <label>Next driver<select required value={handoverForm.newDriverId} onChange={(event) => setHandoverForm({ ...handoverForm, newDriverId: event.target.value })}>
                  <option value="">Select an available driver</option>
                  {drivers.map((member) => <option key={member.id} value={member.id}>{crewLabel(member)}</option>)}
                </select></label>
                <label>Next conductor<select required value={handoverForm.newConductorId} onChange={(event) => setHandoverForm({ ...handoverForm, newConductorId: event.target.value })}>
                  <option value="">Select an available conductor</option>
                  {conductors.map((member) => <option key={member.id} value={member.id}>{crewLabel(member)}</option>)}
                </select></label>
                <button className="button button-primary" disabled={isSubmitting || !drivers.length || !conductors.length}>
                  {isSubmitting ? "Recording handover…" : "Confirm handover"}
                </button>
                <small className="unlinked-help">Only a completed trip can be handed over. Crew must be active, role-matched, non-overlapping, and rested.</small>
              </form>
              <section className="unlinked-table-wrap">
                <h3>Available crew at selected start time</h3>
                <div className="unlinked-crew-list">{availability.map((member) => <div key={member.id}>
                  <span className={`crew-status status-${member.status.toLowerCase().replaceAll(" ", "-")}`}>{member.status}</span>
                  <strong>{member.name}</strong><small>{member.role} · {member.crewId}</small>
                  <small>{member.status === "Resting" ? `Available ${displayDate(member.availableAt)}` : member.currentAssignment ? `Bus ${member.currentAssignment.busNumber}` : "Clear for assignment"}</small>
                </div>)}</div>
              </section>
            </div>
          )}

          {section === "rest" && (
            <div className="unlinked-table-scroll">
              <table className="unlinked-table">
                <thead><tr><th>Crew member</th><th>Role</th><th>Status</th><th>Last duty completed</th><th>Required rest</th><th>Remaining</th></tr></thead>
                <tbody>{crew.map((member) => {
                  const record = availability.find((item) => item.id === member.id);
                  return <tr key={member.id}>
                    <td><strong>{member.name}</strong><small>{member.crewId}</small></td>
                    <td>{member.role}</td>
                    <td><span className={`crew-status status-${crewStatus(member).toLowerCase().replaceAll(" ", "-")}`}>{crewStatus(member)}</span></td>
                    <td>{displayDate(record?.lastDutyCompletedAt)}</td>
                    <td>{record?.requiredRestMinutes ?? restMinutes} min</td>
                    <td>{record?.remainingRestMinutes ? `${record.remainingRestMinutes} min` : "—"}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}

          {section === "calendar" && (
            <div>
              <div className="unlinked-calendar-controls"><label>Starting date<input type="date" value={calendarStart} onChange={(event) => setCalendarStart(event.target.value)} /></label><small>Shows assignments and protected rest periods for seven days.</small></div>
              {calendar.assignments.length || calendar.restPeriods.length ? <div className="unlinked-calendar-list">
                {calendar.assignments.map((assignment) => <article key={`a-${assignment.id}`} className={`calendar-assignment ${assignment.hasOverlap ? "calendar-overlap" : ""}`}>
                  <span className="calendar-mark">{assignment.hasOverlap ? "OVERLAP" : "DUTY"}</span><div><strong>{assignment.crew.name} · {assignment.crew.role}</strong><p>{assignment.duty.dutyNumber} · Bus {assignment.bus.busNumber} · {assignment.status}</p></div>
                  <time>{displayDate(assignment.assignmentStartTime)} – {displayTime(assignment.assignmentEndTime)}</time>
                </article>)}
                {calendar.restPeriods.map((rest) => <article key={`r-${rest.id}`} className="calendar-rest">
                  <span className="calendar-mark">REST</span><div><strong>{rest.crew.name} · {rest.crew.role}</strong><p>Rest after {rest.previousDuty.dutyNumber} · {rest.requiredRestDurationMinutes} minutes required</p></div>
                  <time>{displayDate(rest.restStartTime)} – {displayDate(rest.restEndTime)}</time>
                </article>)}
              </div> : <div className="unlinked-empty">No duties or rest periods in this date range.</div>}
            </div>
          )}

          {section === "history" && (
            <div className="unlinked-table-scroll">
              <table className="unlinked-table">
                <thead><tr><th>Handover time</th><th>Bus</th><th>Previous crew</th><th>New crew</th><th>Previous duty</th><th>Next duty</th></tr></thead>
                <tbody>{handovers.map((handover) => <tr key={handover.id}>
                  <td>{displayDate(handover.handoverTimestamp)}</td>
                  <td>{handover.bus.busNumber}</td>
                  <td>{handover.previousCrewMember.name}<small>{handover.previousCrewMember.role}</small></td>
                  <td>{handover.newCrewMember.name}<small>{handover.newCrewMember.role}</small></td>
                  <td>{handover.previousDuty.dutyNumber}</td>
                  <td>{handover.newDuty.dutyNumber}</td>
                </tr>)}</tbody>
              </table>
              {!handovers.length && <div className="unlinked-empty">No handovers have been recorded.</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
