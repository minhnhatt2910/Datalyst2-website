# Audit đối chiếu KPI Datalyst

## Phạm vi và giới hạn nguồn

- CSV được website tải là `submission_output.csv`: 60 dòng, 12 doanh nghiệp, các năm 2021–2025; mỗi tổ hợp doanh nghiệp/năm chỉ có một dòng.
- CSV chỉ có `revenue_growth_pct`, các tỷ lệ đã tính sẵn, `free_cash_flow_vnd_mn` và `working_capital_vnd_mn` trong nhóm trường tài chính liên quan. CSV không có số tiền doanh thu, lợi nhuận ròng, tài sản, tổng nợ/nợ vay hoặc CFO.
- Trường `evidence_fields` nhắc tới các báo cáo nguồn, nhưng các tệp đó không có trong thư mục dự án. Vì vậy không thể tính lại các tỷ lệ từ số liệu gốc.
- Không thể trích xuất nội dung PDF được tham chiếu trong môi trường này (không có trình trích xuất PDF khả dụng). Các công thức dưới đây mô tả cách website tổng hợp các trường CSV, không được xem là trích dẫn hoặc xác nhận công thức từ mục 3 của PDF.

## Đối chiếu nhóm KPI Dashboard

Phạm vi kết quả dưới đây là tất cả doanh nghiệp, năm 2025 (kỳ mới nhất chung). Trước đây Dashboard hiển thị trung vị; sau thay đổi hiển thị trung bình số học của các giá trị hợp lệ cùng năm. Câu trả lời chatbot theo nhóm dùng cùng trung bình cho các chỉ tiêu liệt kê bên dưới; các chỉ tiêu nhóm khác vẫn giữ trung vị. Số liệu CSV gốc không đổi. Các giá trị trước/sau là số chưa làm tròn; giao diện chỉ làm tròn khi hiển thị.

| KPI | Công thức tổng hợp cũ | Công thức tổng hợp mới | Phạm vi / quan sát | Trước | Sau | Lý do và màn hình |
|---|---|---|---|---:|---:|---|
| Tăng trưởng doanh thu | Trung vị trong câu trả lời chatbot theo nhóm | Trung bình tỷ lệ hợp lệ cùng kỳ | 12 doanh nghiệp, 2025; 12 | 7.5048610577% | 7.0570010620% | Chatbot group answer; không đổi doanh thu tuyệt đối chưa có. |
| Biên lợi nhuận gộp | Trung vị trên biểu đồ Dashboard; trung vị trong chatbot theo nhóm | Trung bình tỷ lệ hợp lệ cùng kỳ | 12 doanh nghiệp, 2025; 12 | 29.9912145500% | 30.3130638964% | Dashboard chart and group chatbot summary. |
| Biên lợi nhuận hoạt động | Trung vị trên biểu đồ Dashboard; trung vị trong chatbot theo nhóm | Trung bình tỷ lệ hợp lệ cùng kỳ | 12 doanh nghiệp, 2025; 12 | 13.5241440632% | 13.6649781142% | Dashboard chart and group chatbot summary. |
| Biên lợi nhuận ròng | Trung vị `net_margin_pct` | Tổng các `net_margin_pct` hợp lệ / số giá trị hợp lệ | 12 doanh nghiệp, 2025; 12 | 9.1295379648% | 9.4795477745% | Bình quân tỷ lệ riêng lẻ mô tả doanh nghiệp bình quân; Dashboard ghi rõ “Bình quân”. Chatbot dùng cùng phép tính khi trả lời theo nhóm. |
| Hệ số thanh toán hiện hành | Trung vị trong chatbot theo nhóm | Trung bình tỷ lệ hợp lệ cùng kỳ | 12 doanh nghiệp, 2025; 12 | 2.9597393214x | 2.8811195329x | Chatbot group answer. |
| Nợ / tài sản | Trung vị `debt_to_assets_pct` | Tổng các `debt_to_assets_pct` hợp lệ / số giá trị hợp lệ | 12 doanh nghiệp, 2025; 12 | 23.5181114674% | 23.5364847877% | Không có số liệu gốc đồng kỳ để tính tỷ lệ hợp nhất; đây là bình quân tỷ lệ CSV, không phải tổng nợ / tổng tài sản. Dashboard và chatbot. |
| Biên CFO | Trung vị trong chatbot theo nhóm | Trung bình tỷ lệ hợp lệ cùng kỳ | 12 doanh nghiệp, 2025; 12 | 4.9672778616% | 7.9751985445% | Chatbot group answer; không suy ra CFO tuyệt đối. |
| CFO / lợi nhuận ròng | Trung vị `cfo_to_net_income_x` | Tổng các `cfo_to_net_income_x` hợp lệ / số giá trị hợp lệ | 12 doanh nghiệp, 2025; 12 | 1.0867424316x | 1.5003105981x | Tỷ lệ CSV được mô tả bằng bình quân doanh nghiệp; không suy ra CFO hoặc lợi nhuận tuyệt đối. Dashboard và chatbot. |
| Dòng tiền tự do (FCF) | Trung vị `free_cash_flow_vnd_mn` | Tổng các FCF hợp lệ / số giá trị hợp lệ | 12 doanh nghiệp, 2025; 12 | -5,551 triệu VND | 67,605.583333 triệu VND | Bình quân số tiền hợp lệ theo doanh nghiệp; giá trị trung bình nhạy với các giá trị lớn, nhưng không bị loại tùy ý. Dashboard. |

Khi chọn một doanh nghiệp, KPI tiếp tục dùng giá trị của đúng doanh nghiệp. Biểu đồ biên lợi nhuận Dashboard và phần tổng quan chatbot dùng trung bình các quan sát hợp lệ cùng năm. Thẻ Cảnh báo rủi ro, số doanh nghiệp, các phép so sánh từng doanh nghiệp, dự báo và quy tắc cảnh báo không đổi. Bảng so sánh nhóm tiếp tục trình bày trung vị riêng như thống kê trung vị.

## KPI thiếu dữ liệu tuyệt đối

| KPI | Kết quả trước | Kết quả sau | Lý do |
|---|---|---|---|
| Tổng doanh thu | Không có dữ liệu phù hợp | Không có dữ liệu phù hợp | Chỉ có tăng trưởng doanh thu; không thể suy ra số tiền từ tỷ lệ tăng trưởng. |
| Lợi nhuận sau thuế | Không có dữ liệu phù hợp | Không có dữ liệu phù hợp | Có biên lợi nhuận và tỷ lệ, không có số tiền lợi nhuận ròng. |
| Tổng tài sản | Không có dữ liệu phù hợp | Không có dữ liệu phù hợp | Có tỷ lệ nợ/tài sản, không có số tiền tài sản. |
| Tổng nợ / nợ vay | Không có dữ liệu phù hợp | Không có dữ liệu phù hợp | Có tỷ lệ nợ/tài sản, không có số tiền nợ phải trả hoặc nợ vay. |
| CFO tuyệt đối | Không có dữ liệu phù hợp | Không có dữ liệu phù hợp | Có biên CFO và CFO/lợi nhuận ròng, không có số tiền CFO. |

Các thẻ này vẫn giữ trạng thái thiếu dữ liệu; không đổi nhãn, không suy diễn số tiền và không biến giá trị thiếu thành 0.

## Công thức và khả năng tổng hợp theo trường CSV

Các trường tỷ lệ trong CSV đã là chỉ tiêu tổng hợp sẵn. Website không thể kiểm tra tử số, mẫu số hoặc tái dựng công thức nguồn khi thiếu các báo cáo gốc.

| Chỉ tiêu trong CSV | Trường | Tổng hợp nhóm phù hợp | Giới hạn |
|---|---|---|---|
| Tăng trưởng doanh thu | `revenue_growth_pct` | Có thể lấy trung bình tỷ lệ hợp lệ cùng kỳ để mô tả nhóm | Không thể suy ra doanh thu tuyệt đối; năm đầu thiếu kỳ so sánh cần để trống. |
| Biên lợi nhuận gộp / hoạt động / ròng | `gross_margin_pct`, `operating_margin_pct`, `net_margin_pct` | Trung bình tỷ lệ riêng lẻ hợp lệ cùng kỳ | Không thể tính biên hợp nhất nếu thiếu doanh thu và lợi nhuận gốc. |
| Hệ số thanh toán hiện hành / nhanh | `current_ratio_x`, `quick_ratio_x` | Có thể lấy trung bình các tỷ lệ hợp lệ cùng kỳ để mô tả nhóm | Không thể thay thế cho tính toán từ các khoản mục bảng cân đối. |
| Nợ / tài sản; nợ / vốn chủ sở hữu | `debt_to_assets_pct`, `debt_to_equity_x` | Trung bình tỷ lệ hợp lệ cùng kỳ | Không thể dựng tổng nợ, tài sản hoặc vốn chủ sở hữu. |
| ROA / ROE | `roa_pct`, `roe_pct` | Trung bình tỷ lệ hợp lệ cùng kỳ | Không xác minh được cách chọn lợi nhuận/tài sản hoặc vốn chủ sở hữu bình quân nếu không có dữ liệu gốc. |
| Biên CFO; CFO / lợi nhuận ròng | `cfo_margin_pct`, `cfo_to_net_income_x` | Trung bình tỷ lệ hợp lệ cùng kỳ | Không suy ra CFO tuyệt đối hoặc tỷ lệ hợp nhất. |
| FCF; vốn lưu động | `free_cash_flow_vnd_mn`, `working_capital_vnd_mn` | Trung bình số tiền hợp lệ cùng kỳ nếu mục đích là doanh nghiệp bình quân | Không phải tổng nhóm; công thức cấu thành không xác minh được từ CSV rút gọn. |
| DSO, số ngày tồn kho, DPO | `dso_days`, `inventory_days`, `dpo_days` | Trung bình giá trị hợp lệ cùng kỳ có thể mô tả nhóm | Không tính lại được nếu thiếu doanh thu, giá vốn và số dư khoản mục. |
| Khả năng trả lãi | `interest_coverage_x` | Trung bình tỷ lệ hợp lệ cùng kỳ có thể mô tả nhóm | Không thể tái dựng từ lợi nhuận hoạt động và chi phí lãi vay thiếu trong CSV. |
| Điểm rủi ro | `risk_score` | Không đổi quy tắc; không dùng bình quân để thay rủi ro riêng | Giữ nguyên nhãn và mức cảnh báo do nguồn cung cấp. |

## Kiểm tra

- Đã đối chiếu phép tính trung bình và trung vị trực tiếp trên 12 dòng CSV năm 2025 cho từng chỉ tiêu thay đổi.
- Đã xác nhận không có dòng trùng doanh nghiệp/năm và mọi trường được dùng ở phạm vi 2025 đều có 12 giá trị số hợp lệ.
- Chưa chạy kiểm tra trình duyệt/Live Server: môi trường hiện tại không có Node.js hoặc công cụ trình duyệt dòng lệnh. PDF cũng chưa thể được đối chiếu nguyên văn.
- Giao diện CSS/HTML, dữ liệu CSV, thuật toán dự báo và logic cảnh báo không bị sửa.
