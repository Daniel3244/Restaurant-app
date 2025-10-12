package pl.restaurant.restaurantbackend.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

public record OrderSearchCriteria(
        Optional<LocalDate> dateFrom,
        Optional<LocalDate> dateTo,
        Optional<LocalTime> timeFrom,
        Optional<LocalTime> timeTo,
        Optional<String> status,
        Optional<String> type
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private LocalDate dateFrom;
        private LocalDate dateTo;
        private LocalTime timeFrom;
        private LocalTime timeTo;
        private String status;
        private String type;

        public Builder dateFrom(LocalDate value) { this.dateFrom = value; return this; }
        public Builder dateTo(LocalDate value) { this.dateTo = value; return this; }
        public Builder timeFrom(LocalTime value) { this.timeFrom = value; return this; }
        public Builder timeTo(LocalTime value) { this.timeTo = value; return this; }
        public Builder status(String value) { this.status = value; return this; }
        public Builder type(String value) { this.type = value; return this; }

        public OrderSearchCriteria build() {
            return new OrderSearchCriteria(
                    Optional.ofNullable(dateFrom),
                    Optional.ofNullable(dateTo),
                    Optional.ofNullable(timeFrom),
                    Optional.ofNullable(timeTo),
                    Optional.ofNullable(status).filter(s -> !s.isBlank()),
                    Optional.ofNullable(type).filter(t -> !t.isBlank())
            );
        }
    }
}

