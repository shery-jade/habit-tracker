## Feature Specification: Habit Timer with Completion Reminder

### Feature Name
Habit Timer and Completion Reminder

### Purpose
This feature allows users to set a timer for a specific habit so they can focus on that activity for a planned amount of time. When the timer ends, the system reminds the user that the session is complete and allows them to mark the habit as done.

### Functional Description
The system shall allow the user to assign a timer duration in minutes for each habit.

The system shall allow the user to start the timer from the habit card.

The system shall display an active countdown while the timer is running.

The system shall notify the user when the timer reaches zero.

After the timer ends, the system shall allow the user to press `Mark Done` to complete the habit for the day.

The system shall allow the user to cancel the timer before it finishes.

The system shall allow the user to edit the timer duration of an existing habit.

If no timer is set for a habit, the user may still mark the habit as done normally.

### Functional Requirements
1. The system shall allow users to enter a timer duration when creating a habit.
2. The system shall store the timer duration for each habit.
3. The system shall display the timer duration on the habit card.
4. The system shall provide a `Start Timer` button for habits with a timer value greater than zero.
5. The system shall begin a countdown immediately after the user presses the timer button.
6. The system shall update the countdown display in real time.
7. The system shall notify the user when the timer has ended.
8. The system shall change the habit status to ready for completion after the timer ends.
9. The system shall enable the `Mark Done` button only after the timer finishes for timed habits.
10. The system shall allow the user to cancel an active timer.
11. The system shall allow users to edit or remove the timer duration.
12. The system shall preserve the timer state while the page remains in use and during normal browser storage behavior.
13. The system shall not allow the habit to be marked done more than once per day.

### User Flow
1. The user creates a habit and enters an optional timer duration.
2. The habit appears in the habit list with its timer information.
3. The user presses `Start Timer`.
4. The countdown begins and is shown on the habit card.
5. When the countdown reaches zero, a notification/reminder appears.
6. The user presses `Mark Done`.
7. The system records the habit as completed for the day.

### Data Requirements
The habit record shall include:
- `timerMinutes` – stores the timer duration in minutes
- `icon` – stores the selected habit icon
- existing completion and streak fields remain unchanged

### Non-Functional Requirements
1. The countdown display shall update clearly and accurately.
2. The notification shall appear immediately when the timer ends.
3. The feature shall remain simple and easy to use within the existing habit dashboard.
4. The timer feature shall support responsive display on desktop and mobile layouts.

### Scope Note
This feature adds timed habit sessions and completion reminders only. It does not include background alarms outside browser support, recurring timer schedules, or advanced productivity reports.
