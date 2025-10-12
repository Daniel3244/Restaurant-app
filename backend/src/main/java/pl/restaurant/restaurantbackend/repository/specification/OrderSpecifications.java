package pl.restaurant.restaurantbackend.repository.specification;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import pl.restaurant.restaurantbackend.dto.OrderSearchCriteria;
import pl.restaurant.restaurantbackend.model.OrderEntity;

public final class OrderSpecifications {

    private OrderSpecifications() {}

    public static Specification<OrderEntity> withCriteria(OrderSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            criteria.dateFrom().ifPresent(dateFrom ->
                    predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), dateFrom))
            );

            criteria.dateTo().ifPresent(dateTo ->
                    predicates.add(cb.lessThanOrEqualTo(root.get("orderDate"), dateTo))
            );

            criteria.status().map(String::toLowerCase).ifPresent(status ->
                    predicates.add(cb.equal(cb.lower(root.get("status")), status))
            );

            criteria.type().map(String::toLowerCase).ifPresent(type ->
                    predicates.add(cb.equal(cb.lower(root.get("type")), type))
            );

            criteria.timeFrom().ifPresent(timeFrom ->
                    predicates.add(cb.greaterThanOrEqualTo(timeExpression(root.get("createdAt"), cb), timeFrom))
            );

            criteria.timeTo().ifPresent(timeTo ->
                    predicates.add(cb.lessThanOrEqualTo(timeExpression(root.get("createdAt"), cb), timeTo))
            );

            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private static jakarta.persistence.criteria.Expression<LocalTime> timeExpression(
            jakarta.persistence.criteria.Path<?> path,
            jakarta.persistence.criteria.CriteriaBuilder cb
    ) {
        return cb.function("TIME", LocalTime.class, path);
    }
}

