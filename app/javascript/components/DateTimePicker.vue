<template>
  <v-dialog v-model="display" :width="dialogWidth">
    <template v-slot:activator="{ on }">
      <v-text-field
        v-bind="textFieldProps"
        :disabled="disabled"
        :loading="loading"
        :label="label"
        :value="datetimeTextFieldValue"
        v-on="on"
        readonly
      >
        <template v-slot:progress>
          <slot name="progress">
            <v-progress-linear color="primary" indeterminate absolute height="2"></v-progress-linear>
          </slot>
        </template>
      </v-text-field>
    </template>

    <v-card>
      <v-card-text class="px-0 py-0">
        <v-tabs fixed-tabs v-model="activeTab">
          <v-tab key="calendar">
            <slot name="dateIcon">
              <v-icon>fa-calendar</v-icon>
            </slot>
          </v-tab>
          <v-tab key="timer" :disabled="dateSelected">
            <slot name="timeIcon">
              <v-icon>fa-clock-o</v-icon>
            </slot>
          </v-tab>
          <v-tab-item key="calendar">
            <v-date-picker
              v-model="date"
              v-bind="datePickerProps"
              @input="showTimePicker"
              :show-current="currentDate"
              full-width
            ></v-date-picker>
          </v-tab-item>
          <v-tab-item key="timer">
            <v-time-picker
              ref="timer"
              class="v-time-picker-custom"
              v-model="time"
              v-bind="timePickerProps"
              full-width
            ></v-time-picker>
          </v-tab-item>
        </v-tabs>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <slot name="actions" :parent="this">
          <v-btn color="grey lighten-1" text @click.native="clearHandler">{{ clearText }}</v-btn>
          <v-btn color="green darken-1" text @click="okHandler">{{ okText }}</v-btn>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { DateTime } from 'luxon'

const DEFAULT_DATE = ''
const DEFAULT_TIME = ''
const DEFAULT_DATE_FORMAT = 'LLLL d, yyyy -'
const DEFAULT_TIME_FORMAT = 'h:mm a ZZZZ'
const DEFAULT_DIALOG_WIDTH = 340
const DEFAULT_CLEAR_TEXT = 'CLEAR'
const DEFAULT_OK_TEXT = 'OK'
const DEFAULT_CURRENT_DATE = DateTime.local().toISODate();

export default {
  name: 'v-datetime-picker',
  model: {
    prop: 'datetime',
    event: 'input'
  },
  props: {
    datetime: {
      type: [DateTime, Date, String],
      default: null
    },
    disabled: {
      type: Boolean
    },
    loading: {
      type: Boolean
    },
    label: {
      type: String,
      default: ''
    },
    dialogWidth: {
      type: Number,
      default: DEFAULT_DIALOG_WIDTH
    },
    dateFormat: {
      type: String,
      default: DEFAULT_DATE_FORMAT
    },
    timeFormat: {
      type: String,
      default: DEFAULT_TIME_FORMAT
    },
    clearText: {
      type: String,
      default: DEFAULT_CLEAR_TEXT
    },
    okText: {
      type: String,
      default: DEFAULT_OK_TEXT
    },
    textFieldProps: {
      type: Object
    },
    datePickerProps: {
      type: Object
    },
    timePickerProps: {
      type: Object
    }
  },
  data() {
    return {
      display: false,
      activeTab: 0,
      date: DEFAULT_DATE,
      time: DEFAULT_TIME,
      currentDate: DEFAULT_CURRENT_DATE
    }
  },
  mounted() {
    this.init()
  },
  computed: {
    dateTimeFormat() {
      return this.dateFormat + ' ' + this.timeFormat
    },
    datetimeTextFieldValue: {
      get() {
        if(this.selectedDatetime) {
          return this.selectedDatetime.toFormat(this.dateTimeFormat);
        } else {
          return '';
        }
      },
      set(value) {
        this.datetime = value;
        this.init();
      }
    },
    selectedDatetime() {
      if (this.date && this.time) {
        let datetimeString = this.date + ' ' + this.time;
        return DateTime.fromFormat(datetimeString, 'yyyy-MM-dd HH:mm');
      } else {
        return null
      }
    },
    dateSelected() {
      return !this.date
    }
  },
  methods: {
    init() {
      if (!this.datetime) {
        this.date = DEFAULT_DATE;
        this.time = DEFAULT_TIME;
        this.currentDate = DateTime.local().toISODate();
        return
      }

      let initDateTime
      if(this.datetime instanceof DateTime) {
        initDateTime = this.datetime;
      } else if(this.datetime instanceof Date) {
        initDateTime = DateTime.fromJSDate(this.datetime);
      } else if(typeof this.datetime === 'string' || this.datetime instanceof String) {
        initDateTime = DateTime.fromISO(this.datetime);
      }

      // These formats are dependent on what vuetify accepts
      this.date = initDateTime.toFormat('yyyy-MM-dd');
      this.time = initDateTime.toFormat('HH:mm');
      // Auto update current date to see if it's changed (e.g. default timezone)
      this.currentDate = DateTime.local().toISODate();
    },
    okHandler() {
      this.resetPicker();
      console.log(this.selectedDatetime);
      console.log(this.selectedDatetime.toISO());
      this.$emit('input', this.selectedDatetime.toISO());
    },
    clearHandler() {
      this.resetPicker();
      this.date = DEFAULT_DATE;
      this.time = DEFAULT_TIME;
      this.$emit('input', null);
    },
    resetPicker() {
      this.display = false;
      this.activeTab = 0;
      if (this.$refs.timer) {
        this.$refs.timer.selectingHour = true;
      }
    },
    showTimePicker() {
      this.activeTab = 1
    }
  },
  watch: {
    datetime: function() {
      this.init()
    }
  }
}
</script>
