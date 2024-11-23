import React, { useState, useRef } from "react";
import "./App.css";

const MOCK_EVENTS = [
  {
    id: 1,
    name: "Team Meeting",
    startTime: "09:00",
    duration: 60,
    notes: "Weekly sync",
    timeZone: "PT",
  },
  {
    id: 2,
    name: "Client Call",
    startTime: "14:30",
    duration: 45,
    notes: "Project review",
    timeZone: "PT",
  },
];

const TIME_ZONES = {
  PT: "Pacific Time",
  MT: "Mountain Time",
  CT: "Central Time",
  ET: "Eastern Time",
};

const TIME_ZONE_OFFSETS = {
  PT: 0,
  MT: 1,
  CT: 2,
  ET: 3,
};

function App() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [globalTimeZone, setGlobalTimeZone] = useState("PT");
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const timeGridRef = useRef(null);

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 12; i++) {
      const hour = i === 0 ? 12 : i;
      slots.push(`${hour}:00`);
    }
    return slots;
  };

  const convertTime = (time, fromZone, toZone) => {
    const [hours, minutes] = time.split(":").map(Number);
    const offset = TIME_ZONE_OFFSETS[toZone] - TIME_ZONE_OFFSETS[fromZone];
    let newHours = hours + offset;

    if (newHours >= 24) newHours -= 24;
    if (newHours < 0) newHours += 24;

    return `${String(newHours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  const calculateEventPosition = (timeString, period) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    let adjustedHours;

    if (period === "AM") {
      adjustedHours = hours === 12 ? 0 : hours;
    } else {
      adjustedHours = hours === 12 ? 0 : hours - 12;
    }

    return (
      (adjustedHours * 60 + minutes) * (timeGridRef.current?.clientHeight / 720)
    );
  };

  const checkConflicts = (newEvent, excludeId = null) => {
    return events.filter(
      (event) =>
        event.id !== excludeId &&
        isTimeConflict(
          convertTime(newEvent.startTime, newEvent.timeZone, "PT"),
          newEvent.duration,
          convertTime(event.startTime, event.timeZone, "PT"),
          event.duration
        )
    );
  };

  const isTimeConflict = (start1, duration1, start2, duration2) => {
    const [h1, m1] = start1.split(":").map(Number);
    const [h2, m2] = start2.split(":").map(Number);

    const startMinutes1 = h1 * 60 + m1;
    const endMinutes1 = startMinutes1 + duration1;
    const startMinutes2 = h2 * 60 + m2;
    const endMinutes2 = startMinutes2 + duration2;

    return !(endMinutes1 <= startMinutes2 || startMinutes1 >= endMinutes2);
  };

  const handleAddEvent = (event) => {
    const conflicts = checkConflicts(event);
    if (conflicts.length > 0) {
      setModalContent({
        type: "conflict",
        conflicts,
        newEvent: event,
      });
      setShowModal(true);
      return false;
    }

    setEvents([...events, { ...event, id: Date.now() }]);
    return true;
  };

  const handleUpdateEvent = (updatedEvent) => {
    const conflicts = checkConflicts(updatedEvent, updatedEvent.id);
    if (conflicts.length > 0) {
      setModalContent({
        type: "conflict",
        conflicts,
        newEvent: updatedEvent,
      });
      setShowModal(true);
      return false;
    }

    setEvents(
      events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
    return true;
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };

  const handleDragStart = (event, eventData) => {
    setDraggedEvent(eventData);
    event.dataTransfer.setData("text/plain", "");
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event, period) => {
    event.preventDefault();
    if (!draggedEvent || !timeGridRef.current) return;

    const gridRect = timeGridRef.current.getBoundingClientRect();
    const dropY = event.clientY - gridRect.top;
    const totalMinutes = (dropY / gridRect.clientHeight) * 720;

    let hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    if (period === "PM") {
      hours = hours === 0 ? 12 : hours + 12;
    } else {
      hours = hours === 0 ? 12 : hours;
    }

    const newStartTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
    const updatedEvent = { ...draggedEvent, startTime: newStartTime };

    handleUpdateEvent(updatedEvent);
    setDraggedEvent(null);
  };

  return (
    <div className="schedule-container">
      <div className="toolbar">
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
        <select
          value={globalTimeZone}
          onChange={(e) => setGlobalTimeZone(e.target.value)}
        >
          {Object.entries(TIME_ZONES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setModalContent({ type: "add" });
            setShowModal(true);
          }}
        >
          Add Event
        </button>
      </div>

      <div className="schedule-wrapper">
        <div className="time-indicators">
          {generateTimeSlots().map((timeSlot, index) => (
            <div key={index} className="time-slot">
              {timeSlot}
            </div>
          ))}
        </div>

        <div className="schedule-columns">
          <div className="schedule-column">
            <h3>AM</h3>
            <div
              className="schedule-grid"
              ref={timeGridRef}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "AM")}
            >
              <div className="time-lines">
                {generateTimeSlots().map((_, index) => (
                  <div key={index} className="time-line" />
                ))}
              </div>

              <div className="events-container">
                {events
                  .filter((event) => {
                    const time = convertTime(
                      event.startTime,
                      event.timeZone,
                      globalTimeZone
                    );
                    const hours = parseInt(time.split(":")[0]);
                    return hours === 12 || (hours >= 1 && hours <= 11);
                  })
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      globalTimeZone={globalTimeZone}
                      onDragStart={handleDragStart}
                      onUpdate={handleUpdateEvent}
                      onDelete={handleDeleteEvent}
                      onEdit={() => {
                        setModalContent({ type: "edit", newEvent: event });
                        setShowModal(true);
                      }}
                      convertTime={convertTime}
                      position={calculateEventPosition(
                        convertTime(
                          event.startTime,
                          event.timeZone,
                          globalTimeZone
                        ),
                        "AM"
                      )}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div className="schedule-column">
            <h3>PM</h3>
            <div
              className="schedule-grid"
              ref={timeGridRef}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "PM")}
            >
              <div className="time-lines">
                {generateTimeSlots().map((_, index) => (
                  <div key={index} className="time-line" />
                ))}
              </div>

              <div className="events-container">
                {events
                  .filter((event) => {
                    const time = convertTime(
                      event.startTime,
                      event.timeZone,
                      globalTimeZone
                    );
                    const hours = parseInt(time.split(":")[0]);
                    return hours >= 12 && hours <= 23;
                  })
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      globalTimeZone={globalTimeZone}
                      onDragStart={handleDragStart}
                      onUpdate={handleUpdateEvent}
                      onDelete={handleDeleteEvent}
                      onEdit={() => {
                        setModalContent({ type: "edit", newEvent: event });
                        setShowModal(true);
                      }}
                      convertTime={convertTime}
                      position={calculateEventPosition(
                        convertTime(
                          event.startTime,
                          event.timeZone,
                          globalTimeZone
                        ),
                        "PM"
                      )}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal
          content={modalContent}
          onClose={() => setShowModal(false)}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
        />
      )}
    </div>
  );
}

function EventCard({
  event,
  globalTimeZone,
  onDragStart,
  onUpdate,
  onDelete,
  onEdit,
  convertTime,
  position,
}) {
  const displayTime = convertTime(
    event.startTime,
    event.timeZone,
    globalTimeZone
  );
  const [hours, minutes] = displayTime.split(":").map(Number);

  const formatTime = (hours, minutes) => {
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const endTime = () => {
    let totalMinutes = hours * 60 + minutes + event.duration;
    let endHours = Math.floor(totalMinutes / 60);
    let endMinutes = totalMinutes % 60;

    if (endHours >= 24) {
      endHours -= 24;
    }

    return formatTime(endHours, endMinutes);
  };

  return (
    <div
      className="event-card"
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      style={{
        position: "absolute",
        top: `${position}px`,
        height: `${event.duration}px`,
        width: "calc(100% - 20px)",
        left: "10px",
      }}
    >
      <h4>{event.name}</h4>
      <p>
        {formatTime(hours, minutes)} - {endTime()}
      </p>
      <p>{event.duration} min</p>
      <p>{event.notes}</p>
      <div className="event-actions">
        <button onClick={onEdit} className="edit-button">
          Edit
        </button>
        <button onClick={() => onDelete(event.id)} className="delete-button">
          Delete
        </button>
      </div>
    </div>
  );
}

function Modal({ content, onClose, onAddEvent, onUpdateEvent }) {
  const [formData, setFormData] = useState(
    content.type === "add"
      ? {
          name: "",
          startTime: "09:00",
          duration: 60,
          notes: "",
          timeZone: "PT",
        }
      : content.newEvent
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const success =
      content.type === "add" ? onAddEvent(formData) : onUpdateEvent(formData);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        {content.type === "conflict" ? (
          <div>
            <h3>Time Conflict Detected</h3>
            <p>This event conflicts with:</p>
            {content.conflicts.map((event) => (
              <div key={event.id}>
                <p>
                  {event.name} at {event.startTime}
                </p>
              </div>
            ))}
            <button onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>{content.type === "add" ? "Add Event" : "Edit Event"}</h3>
            <input
              type="text"
              placeholder="Event Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) })
              }
              required
            />
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
            <select
              value={formData.timeZone}
              onChange={(e) =>
                setFormData({ ...formData, timeZone: e.target.value })
              }
            >
              {Object.entries(TIME_ZONES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button type="submit">Save</button>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
