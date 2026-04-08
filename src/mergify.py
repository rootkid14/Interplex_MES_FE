import os
import re
from pathlib import Path

def minify_for_llm(src_dir, output_file):
    src_path = Path(src_dir)
    combined_content = []

    if not src_path.is_dir():
        print(f"Lỗi: Không tìm thấy thư mục '{src_dir}'")
        return

    # Quét tất cả file .js và .jsx
    for file_path in src_path.rglob('*'):
        if file_path.is_file() and file_path.suffix in ['.js', '.jsx']:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Tối ưu cho LLM: 
                    # Thay thế MỌI chuỗi khoảng trắng, tab, xuống dòng liên tiếp thành 1 dấu cách
                    optimized_content = re.sub(r'\s+', ' ', content)
                    
                    # Thêm comment tên file để LLM biết đoạn code này thuộc file nào
                    # Điều này CỰC KỲ QUAN TRỌNG để AI hiểu kiến trúc dự án
                    file_header = f"/* --- File: {file_path.as_posix()} --- */ "
                    
                    combined_content.append(file_header + optimized_content.strip())
                    print(f"Đã xử lý: {file_path}")
            except Exception as e:
                print(f"Lỗi khi đọc file {file_path}: {e}")

    try:
        # Ghi ra file với các đoạn code cách nhau bởi 1 dấu xuống dòng
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(combined_content))
        print(f"\n✅ Hoàn tất! File tối ưu cho LLM đã được lưu tại '{output_file}'")
    except Exception as e:
        print(f"Lỗi khi ghi file output: {e}")

if __name__ == "__main__":
    SOURCE_DIRECTORY = '.' 
    OUTPUT_FILENAME = 'llm_context_code.txt'
    
    minify_for_llm(SOURCE_DIRECTORY, OUTPUT_FILENAME)