// Calendar.jsx
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useAdminCalendar } from "../../hooks/Admin/useCalender";
import { useAdminVenue } from "../../hooks/Admin/useVanue";
import { useEvents } from "../../hooks/organiser/useMyEvents";

// === Safe date parser ===
const safeParseDate = (dateString) => {
  if (!dateString) return new Date(NaN);
  if (dateString.includes("T")) return new Date(dateString);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString))
    return new Date(`${dateString}T00:00:00Z`);
  return new Date(dateString);
};


// =========================

export default function AdminCalendar() {
  const { approvedEvents } = useEvents();
  const { venues } = useAdminVenue();
  const { availableDates, addDates, updateDate, deleteDate, reload } =
    useAdminCalendar();

  const [events, setEvents] = useState({});
  const [tempDates, setTempDates] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [availableModalVisible, setAvailableModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAvailableDate, setSelectedAvailableDate] = useState(null);
  const [approvedModalVisible, setApprovedModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState({});
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);

  // Merge dots helper
  const getMergedDots = (date) => {
    const approvedDot = approvedEvents.some((e) => {
      const d = safeParseDate(e.displayDate);
      return !isNaN(d.getTime()) && d.toISOString().split("T")[0] === date;
    })
      ? [{ key: `approved-${date}`, color: "red" }]
      : [];

    const availableDot = availableDates.some((d) => d.date === date)
      ? [{ key: `available-${date}`, color: "blue" }]
      : [];

    const tempDot = tempDates.some((d) => d.date === date)
      ? [{ key: `temp-${date}`, color: "orange" }]
      : [];

    return [...approvedDot, ...availableDot, ...tempDot];
  };

  // Build calendar markings
  useEffect(() => {
    const allDates = [
      ...approvedEvents
        .map((e) => {
          const d = safeParseDate(e.displayDate);
          return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
        })
        .filter(Boolean),
      ...availableDates.map((d) => d.date),
      ...tempDates.map((d) => d.date),
    ];

    const marks = {};
    allDates.forEach((date) => {
      const dots = getMergedDots(date);
      if (dots.length > 0) {
        const approvedEvent = approvedEvents.find((e) => {
          const d = safeParseDate(e.displayDate);
          return !isNaN(d.getTime()) && d.toISOString().split("T")[0] === date;
        });
        const available = availableDates.find((d) => d.date === date);
        const temp = tempDates.find((d) => d.date === date);

        marks[date] = {
          dots,
          ...(approvedEvent
            ? {
              event: {
                title: approvedEvent.title,
                time: approvedEvent.time,
                location: approvedEvent.location,
              },
            }
            : {}),
          ...(available ? { available } : {}),
          ...(temp ? { temp } : {}),
        };
      }
    });

    // Format marks
    const formattedMarks = {};
    Object.entries(marks).forEach(([date, val]) => {
      formattedMarks[date] = {
        dots: val.dots.map((dot) => ({ key: dot.key, color: dot.color })),
        marked: val.dots.length > 0,
        ...val, // keep extra info for modals
        selected: false, // ✅ ensures mobile renders correctly
      };
    });

    setEvents(formattedMarks);
  }, [approvedEvents, availableDates, tempDates]);
  console.log("Approved events:", approvedEvents);

  // Handle day press
  const handleDayPress = (day) => {
    const date = day.dateString;
    const event = events[date]?.event;
    const available = events[date]?.available;

    if (event) {
      setSelectedEvent(event);
      setApprovedModalVisible(true);
      return;
    }

    if (available) {
      setSelectedAvailableDate(available);
      setSelectedVenueIds(available.venueIds || []);
      setAvailableModalVisible(true);
      return;
    }

    if (multiSelectMode) {
      setTempDates((prev) => {
        if (prev.find((d) => d.date === date)) {
          return prev.filter((d) => d.date !== date);
        } else {
          return [...prev, { date, startTime: "", endTime: "", venueIds: [] }];
        }
      });
    } else {
      setTempDates([{ date, startTime: "", endTime: "", venueIds: [] }]);
      setSelectedVenueIds([]);
      setAvailableModalVisible(true);
    }
  };

  // Update time for a date
  const updateDateTime = (date, field, value) => {
    setTempDates((prev) =>
      prev.map((d) => (d.date === date ? { ...d, [field]: value } : d))
    );
    if (selectedAvailableDate && selectedAvailableDate.date === date) {
      setSelectedAvailableDate((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleTimeChange = (event, time, dateObj, field) => {
    if (time) {
      const hours = time.getHours().toString().padStart(2, "0");
      const minutes = time.getMinutes().toString().padStart(2, "0");
      updateDateTime(dateObj.date, field, `${hours}:${minutes}`);
    }
    setShowPicker((prev) => ({ ...prev, [dateObj.date + field]: false }));
  };

  // Venue toggle
  const toggleVenueSelection = (venueId) => {
    setSelectedVenueIds((prev) =>
      prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId]
    );
  };

  // Save available dates
  const handleSaveAvailableDates = async () => {
    if (selectedVenueIds.length === 0) {
      Alert.alert("Error", "Please select at least one venue.");
      return;
    }

    try {
      let savedDates = [];

      if (selectedAvailableDate) {
        await updateDate({
          ...selectedAvailableDate,
          venueIds: selectedVenueIds,
        });
        savedDates = [{ ...selectedAvailableDate, venueIds: selectedVenueIds }];
      } else {
        const newDates = tempDates.map((d) => ({
          ...d,
          venueIds: selectedVenueIds,
        }));
        await addDates(newDates);
        savedDates = newDates;
      }

      setEvents((prev) => {
        const updated = { ...prev };
        savedDates.forEach((d) => {
          const existingDots = updated[d.date]?.dots || [];
          const filtered = existingDots.filter(dot => dot.key !== "available");
          updated[d.date] = {
            ...updated[d.date],
            dots: [...filtered, { key: "available", color: "blue" }],
            marked: true,
            available: d,
            selected: false,
          };
        });
        return updated;
      });

      setAvailableModalVisible(false);
      setMultiSelectMode(false);
      setTempDates([]);
      setSelectedAvailableDate(null);
      setSelectedVenueIds([]);

      reload(); // ✅ reload after updating UI
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save dates.");
    }
  };

  const handleDeleteAvailableDate = async (date) => {
    const updatedEvents = { ...events };
    if (updatedEvents[date]) {
      const remainingDots =
        updatedEvents[date].dots?.filter((dot) => dot.key !== "available") || [];
      if (remainingDots.length > 0) {
        updatedEvents[date] = {
          ...updatedEvents[date],
          dots: remainingDots,
          marked: true,
          available: undefined,
          selected: false,
        };
      } else {
        delete updatedEvents[date];
      }
    }
    setEvents(updatedEvents);

    setAvailableModalVisible(false);
    setSelectedAvailableDate(null);
    await deleteDate(date);
    reload();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Calendar - Available Dates</Text>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 }}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            multiSelectMode && { backgroundColor: "#005f99" },
          ]}
          onPress={() => setMultiSelectMode(!multiSelectMode)}
        >
          <Text style={styles.buttonText}>Select More</Text>
        </TouchableOpacity>
        {multiSelectMode && tempDates.length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedVenueIds([]);
              setAvailableModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ Calendar */}
      <Calendar
        onDayPress={handleDayPress}
        markedDates={Object.keys(events).reduce((acc, date) => {
          acc[date] = {
            dots: events[date].dots || [],
            marked: (events[date].dots || []).length > 0,
            selected: false,
          };
          return acc;
        }, {})}
        markingType="multi-dot"
        theme={{
          todayTextColor: "#0077B6",
          arrowColor: "#0077B6",
          selectedDayBackgroundColor: "#0077B6",
          monthTextColor: "#0077B6",
        }}
      />

      {/* === Approved Event Modal === */}
      <Modal visible={approvedModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalCentered}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Event Details</Text>
              {selectedEvent && (
                <>
                  <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.eventTime}>Time: {selectedEvent.time}</Text>
                  <Text style={styles.eventTime}>
                    Venue: {selectedEvent.location}
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "gray", marginTop: 15 }]}
                onPress={() => setApprovedModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === Available Dates Modal === */}
      <Modal visible={availableModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalCentered}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>Set Availability</Text>

                {/* Venue Selection */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                    Select venues available on these dates:
                  </Text>
                  {venues.map((venue) => (
                    <TouchableOpacity
                      key={venue.id}
                      style={[
                        styles.venueOption,
                        selectedVenueIds.includes(venue.id) && styles.venueOptionSelected,
                      ]}
                      onPress={() => toggleVenueSelection(venue.id)}
                    >
                      <Text>{venue.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {(() => {
                  if (selectedAvailableDate) {
                    return [selectedAvailableDate];
                  } else if (tempDates.length > 0) {
                    return tempDates;
                  } else {
                    return [];
                  }
                })().map((d) => (
                  <View key={d.date} style={{ marginBottom: 15 }}>
                    <Text style={{ fontWeight: "bold", marginBottom: 5 }}>{d.date}</Text>

                    {/* Time Pickers */}
                    {Platform.OS === "web" ? (
                      <>
                        <input
                          type="time"
                          value={d.startTime || ""}
                          onChange={(e) => updateDateTime(d.date, "startTime", e.target.value)}
                          style={styles.webInput}
                        />
                        <input
                          type="time"
                          value={d.endTime || ""}
                          onChange={(e) => updateDateTime(d.date, "endTime", e.target.value)}
                          style={styles.webInput}
                        />
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.input}
                          onPress={() => setShowPicker((prev) => ({ ...prev, [d.date + "startTime"]: true }))}
                        >
                          <Text>{d.startTime || "Select Start Time"}</Text>
                        </TouchableOpacity>
                        {showPicker[d.date + "startTime"] && (
                          <DateTimePicker
                            value={d.startTime ? new Date(`1970-01-01T${d.startTime}:00`) : new Date()}
                            mode="time"
                            display="default"
                            onChange={(e, time) => handleTimeChange(e, time, d, "startTime")}
                          />
                        )}

                        <TouchableOpacity
                          style={styles.input}
                          onPress={() => setShowPicker((prev) => ({ ...prev, [d.date + "endTime"]: true }))}
                        >
                          <Text>{d.endTime || "Select End Time"}</Text>
                        </TouchableOpacity>
                        {showPicker[d.date + "endTime"] && (
                          <DateTimePicker
                            value={d.endTime ? new Date(`1970-01-01T${d.endTime}:00`) : new Date()}
                            mode="time"
                            display="default"
                            onChange={(e, time) => handleTimeChange(e, time, d, "endTime")}
                          />
                        )}
                      </>
                    )}

                    {selectedAvailableDate && (
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: "#880808", marginTop: 5 }]}
                        onPress={() => handleDeleteAvailableDate(d.id)}
                      >
                        <Text style={styles.buttonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Optional: Show message if no dates to edit */}
                {(selectedAvailableDate || tempDates.length > 0) ? null : (
                  <Text style={{ textAlign: 'center', color: '#888', marginVertical: 20 }}>
                    No dates selected for editing.
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#0077B6" }]}
                    onPress={handleSaveAvailableDates}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "gray" }]}
                    onPress={() => {
                      setAvailableModalVisible(false);
                      setSelectedAvailableDate(null);
                      setMultiSelectMode(false);
                      setTempDates([]);
                      setSelectedVenueIds([]);
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F9FAFB" },
  header: { fontSize: 22, fontWeight: "bold", color: "#0077B6", marginBottom: 10 },
  eventTitle: { fontSize: 18, fontWeight: "bold", color: "#0077B6" },
  eventTime: { fontSize: 16, color: "#555", marginTop: 5 },
  modalContainer: { flex: 1, backgroundColor: "#00000090", justifyContent: "center", alignItems: "center" },
  modalCentered: { width: "90%", maxHeight: "80%" },
  scrollContent: { flexGrow: 1 },
  modalContent: { backgroundColor: "white", borderRadius: 15, padding: 20 },
  modalHeader: { fontSize: 18, fontWeight: "bold", color: "#0077B6", marginBottom: 15 },
  input: { borderWidth: 1, borderColor: "#0077B6", borderRadius: 8, padding: 8, marginBottom: 10 },
  webInput: { borderWidth: 1, borderColor: "#0077B6", borderRadius: 8, padding: 8, marginBottom: 10, width: "100%" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { flex: 1, marginHorizontal: 5, padding: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  actionButton: {
    marginHorizontal: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0077B6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  venueOption: { padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 6, marginBottom: 5 },
  venueOptionSelected: { backgroundColor: "#e6f2ff", borderColor: "#0077B6" },
});
