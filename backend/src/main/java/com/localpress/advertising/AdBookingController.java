package com.localpress.advertising;

import com.localpress.finance.dto.response.OrderCreateResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

/** SV1 Iteration 2: Campaign Booking, Quotation Confirmation, Advertising Payment, Creative Submission. */
@RestController
@RequestMapping("/api/v1")
public class AdBookingController {
    private final AdBookingService bookings;
    private final AdCreativeService creatives;

    public AdBookingController(AdBookingService bookings, AdCreativeService creatives) {
        this.bookings = bookings;
        this.creatives = creatives;
    }

    public record BookingRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9-]{8,64}", message = "Mã yêu cầu không hợp lệ") String requestKey,
                                 @NotBlank(message = "Vui lòng nhập tên chiến dịch") @Size(max = 255) String campaignName,
                                 @NotNull(message = "Vui lòng chọn vị trí quảng cáo") @Positive Long slotId,
                                 @NotNull(message = "Vui lòng chọn ngày bắt đầu") LocalDate startDate,
                                 @NotNull(message = "Vui lòng chọn ngày kết thúc") LocalDate endDate,
                                 @NotBlank @Size(max = 150) String contactPerson,
                                 @NotBlank @Pattern(regexp = "0[35789][0-9]{8}", message = "Số di động Việt Nam phải có 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09") String contactPhone,
                                 @NotBlank @Email(message = "Email liên hệ không hợp lệ") @Size(max = 255) String contactEmail) {}

    public record AcceptQuoteRequest(@NotNull(message = "Thiếu phiên bản báo giá") @Positive Integer quoteVersion,
                                     boolean termsAccepted) {}

    @GetMapping("/advertiser/slots/{slotId}/availability")
    public AdBookingService.Availability availability(@PathVariable long slotId, @RequestParam LocalDate startDate,
                                                      @RequestParam LocalDate endDate) {
        return bookings.availability(slotId, startDate, endDate);
    }

    @GetMapping("/advertiser/bookings")
    public List<AdBookingService.Booking> myBookings(Authentication auth) {
        return bookings.myBookings(auth.getName());
    }

    @PostMapping("/advertiser/bookings")
    public AdBookingService.Booking createBooking(Authentication auth, @Valid @RequestBody BookingRequest input) {
        return bookings.createBooking(auth.getName(), new AdBookingService.BookingInput(input.requestKey(),
                input.campaignName().trim(), input.slotId(), input.startDate(), input.endDate(),
                input.contactPerson().trim(), input.contactPhone(), input.contactEmail().trim()));
    }

    @GetMapping("/advertiser/bookings/{id}")
    public AdBookingService.Booking booking(Authentication auth, @PathVariable long id) {
        return bookings.booking(auth.getName(), id);
    }

    @PostMapping("/advertiser/bookings/{id}/accept-quote")
    public AdBookingService.Booking acceptQuote(Authentication auth, @PathVariable long id,
                                                @Valid @RequestBody AcceptQuoteRequest input) {
        return bookings.acceptQuotation(auth.getName(), id, input.quoteVersion(), input.termsAccepted());
    }

    @GetMapping("/advertiser/campaigns/{id}")
    public AdCreativeService.Campaign campaign(Authentication auth, @PathVariable long id) {
        return creatives.campaign(auth.getName(), id);
    }

    @PostMapping("/advertiser/campaigns/{id}/payment")
    public OrderCreateResponse payment(Authentication auth, @PathVariable long id) {
        return bookings.createPayment(auth.getName(), id);
    }

    @PostMapping(value = "/advertiser/campaigns/{id}/creatives", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AdCreativeService.Creative uploadCreative(Authentication auth, @PathVariable long id,
                                                     @RequestPart("file") MultipartFile file,
                                                     @RequestPart("title") String title,
                                                     @RequestPart("targetUrl") String targetUrl) {
        return creatives.upload(auth.getName(), id, file, title, targetUrl);
    }

    /** Ảnh banner là nội dung công khai (sẽ hiện trên trang báo), tên file là UUID ngẫu nhiên. */
    @GetMapping("/ad-slots/creative-files/{filename}")
    public ResponseEntity<Resource> creativeFile(@PathVariable String filename) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(creatives.load(filename));
    }
}
