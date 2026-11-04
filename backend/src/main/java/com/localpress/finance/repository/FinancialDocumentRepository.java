package com.localpress.finance.repository;

import com.localpress.finance.model.FinancialDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinancialDocumentRepository extends JpaRepository<FinancialDocument, Long> {

    Optional<FinancialDocument> findByTransactionId(Long transactionId);

    List<FinancialDocument> findByUserIdOrderByIssuedAtDescDocumentIdDesc(Long userId);

    List<FinancialDocument> findByUserIdAndDocumentTypeOrderByIssuedAtDescDocumentIdDesc(Long userId, FinancialDocument.Type type);

    /**
     * Tăng số thứ tự của loại chứng từ trong năm bằng 1 câu lệnh nguyên tử: dòng đầu năm tạo với 1,
     * các lần sau +1. Dòng bị khóa đến hết giao dịch nên 2 đơn cùng lúc không lấy trùng số;
     * đọc lại số vừa cấp bằng {@link #currentSequence} trong cùng giao dịch.
     */
    @Modifying
    @Query(value = """
            INSERT INTO financial_document_sequences (document_type, document_year, last_no)
            VALUES (:type, :year, 1)
            ON DUPLICATE KEY UPDATE last_no = last_no + 1
            """, nativeQuery = true)
    int bumpSequence(@Param("type") String type, @Param("year") int year);

    @Query(value = "SELECT last_no FROM financial_document_sequences WHERE document_type = :type AND document_year = :year",
            nativeQuery = true)
    Number currentSequence(@Param("type") String type, @Param("year") int year);
}
