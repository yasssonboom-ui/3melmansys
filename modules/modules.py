import hmac
import os
import re
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime
from functools import wraps

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, create_engine, inspect, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

modules = Blueprint("modules", __name__)

database_url = os.environ.get("DATABASE_URL", "sqlite:///main.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(database_url, connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120))
    carts = relationship("Cart", back_populates="user")
    orders = relationship("Order", back_populates="user")


class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    user = relationship("User", back_populates="carts")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    customer_order_id = Column(Integer, ForeignKey("customer_orders.id"), nullable=True)
    product_name = Column(String(120), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    user = relationship("User", back_populates="orders")
    product = relationship("Product")
    customer_order = relationship("CustomerOrder", back_populates="items")


class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(Integer, primary_key=True)
    reference = Column(String(32), unique=True, nullable=False, default=lambda: uuid.uuid4().hex[:12].upper())
    customer_name = Column(String(120), nullable=False)
    phone = Column(String(30), nullable=False)
    address = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="new")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    items = relationship("Order", back_populates="customer_order", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    price = Column(Numeric(10, 2), nullable=False, default=0)
    sale_price = Column(Numeric(10, 2), nullable=True)
    description = Column(Text, nullable=False, default="")
    image_url = Column(String(500), nullable=False, default="")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")

    @property
    def current_price(self):
        if self.sale_price is not None and 0 < self.sale_price < self.price:
            return self.sale_price
        return self.price


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    email = Column(String(254), nullable=False, unique=True)
    password_hash = Column(String(256), nullable=False)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(254), nullable=False)
    phone = Column(String(30), nullable=False, default="")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


Base.metadata.create_all(engine)

# create_all does not add columns to an existing SQLite products table.
with engine.begin() as connection:
    product_columns = {column["name"] for column in inspect(connection).get_columns("products")}
    if "sale_price" not in product_columns:
        connection.exec_driver_sql("ALTER TABLE products ADD COLUMN sale_price NUMERIC(10, 2)")
    if "image_url" not in product_columns:
        connection.exec_driver_sql("ALTER TABLE products ADD COLUMN image_url VARCHAR(500) NOT NULL DEFAULT ''")
    if "category_id" not in product_columns:
        connection.exec_driver_sql("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)")
    order_columns = {column["name"] for column in inspect(connection).get_columns("orders")}
    if "customer_order_id" not in order_columns:
        connection.exec_driver_sql("ALTER TABLE orders ADD COLUMN customer_order_id INTEGER REFERENCES customer_orders(id)")
    if "product_name" not in order_columns:
        connection.exec_driver_sql("ALTER TABLE orders ADD COLUMN product_name VARCHAR(120)")
    if "unit_price" not in order_columns:
        connection.exec_driver_sql("ALTER TABLE orders ADD COLUMN unit_price NUMERIC(10, 2)")

with SessionLocal() as db:
    if db.scalar(select(Admin.id).limit(1)) is None:
        initial_email = os.environ.get("ADMIN_EMAIL", "elmansygroups@gmail.com").strip().lower()
        initial_password = os.environ.get("ADMIN_PASSWORD", "12345678")
        db.add(Admin(email=initial_email, password_hash=generate_password_hash(initial_password)))
        db.commit()


def csrf_token():
    token = session.get("_csrf_token")
    if token is None:
        token = os.urandom(32).hex()
        session["_csrf_token"] = token
    return token


@modules.context_processor
def inject_template_values():
    cart = session.get("cart", {})
    cart_count = sum(int(quantity) for quantity in cart.values() if str(quantity).isdigit())
    return {
        "csrf_token": csrf_token,
        "now_year": datetime.now().year,
        "cart_count": cart_count,
    }


@modules.before_app_request
def protect_post_requests():
    if request.method == "POST":
        submitted_token = request.form.get("_csrf_token", "")
        expected_token = session.get("_csrf_token", "")
        if not expected_token or not hmac.compare_digest(submitted_token, expected_token):
            abort(400, description="الجلسة انتهت. حدّث الصفحة وجرب تاني.")


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id"):
            return redirect(url_for("modules.admin_login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


@modules.get("/")
def home():
    with SessionLocal() as db:
        categories = db.scalars(select(Category).order_by(Category.name)).all()
        products = db.scalars(select(Product).order_by(Product.id.desc())).all()
        return render_template("index.html", categories=categories, products=products)


@modules.get("/category/<int:category_id>")
def category_page(category_id):
    with SessionLocal() as db:
        category = db.get(Category, category_id)
        if category is None:
            abort(404)
        categories = db.scalars(select(Category).order_by(Category.name)).all()
        products = db.scalars(
            select(Product).where(Product.category_id == category_id).order_by(Product.id.desc())
        ).all()
        return render_template(
            "index.html",
            categories=categories,
            products=products,
            active_category=category,
        )


@modules.route("/contact", methods=["GET", "POST"])
def contact():
    form_data = {
        "name": "",
        "email": "",
        "phone": "",
        "message": "",
    }
    if request.method == "POST":
        form_data = {
            "name": request.form.get("name", "").strip(),
            "email": request.form.get("email", "").strip(),
            "phone": request.form.get("phone", "").strip(),
            "message": request.form.get("message", "").strip(),
        }
        if not 2 <= len(form_data["name"]) <= 120:
            flash("اكتب اسمك (من حرفين لـ 120 حرف).", "error")
        elif len(form_data["email"]) > 254 or not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+", form_data["email"]
        ):
            flash("اكتب إيميل صحيح علشان نقدر نرد عليك.", "error")
        elif form_data["phone"] and not re.fullmatch(r"[0-9+()\-\s.]{7,24}", form_data["phone"]):
            flash("رقم الموبايل مش صحيح.", "error")
        elif not 10 <= len(form_data["message"]) <= 3000:
            flash("اكتب رسالتك (من 10 لـ 3000 حرف).", "error")
        else:
            with SessionLocal() as db:
                db.add(ContactMessage(**form_data))
                db.commit()
            flash("وصلتنا رسالتك، شكراً إنك كلمتنا! هنرد عليك قريب.", "success")
            return redirect(url_for("modules.contact"))
    return render_template("contact.html", form_data=form_data)


@modules.get("/cart")
def view_cart():
    cart = session.get("cart", {})
    product_ids = []
    for product_id in cart:
        try:
            product_ids.append(int(product_id))
        except (TypeError, ValueError):
            continue
    with SessionLocal() as db:
        products = db.scalars(select(Product).where(Product.id.in_(product_ids))).all() if product_ids else []
        products_by_id = {product.id: product for product in products}
        cart_items = []
        valid_cart = {}
        total = Decimal("0.00")
        for product_id, raw_quantity in cart.items():
            try:
                quantity = int(raw_quantity)
                product = products_by_id.get(int(product_id))
            except (TypeError, ValueError):
                continue
            if product is None or quantity < 1:
                continue
            quantity = min(quantity, 99)
            valid_cart[str(product.id)] = quantity
            line_total = product.current_price * quantity
            total += line_total
            cart_items.append({"product": product, "quantity": quantity, "line_total": line_total})
        if valid_cart != cart:
            session["cart"] = valid_cart
        return render_template("cart.html", cart_items=cart_items, cart_total=total)


@modules.post("/cart/add/<int:product_id>")
def add_to_cart(product_id):
    with SessionLocal() as db:
        product = db.get(Product, product_id)
        if product is None:
            abort(404)
        cart = session.get("cart", {})
        current_quantity = cart.get(str(product_id), 0)
        try:
            current_quantity = int(current_quantity)
        except (TypeError, ValueError):
            current_quantity = 0
        if current_quantity >= 99:
            flash("وصلت للحد الأقصى من المنتج ده في السلة.", "error")
        else:
            cart[str(product_id)] = current_quantity + 1
            session["cart"] = cart
            flash(f'ضفنا "{product.name}" لسلتك.', "success")
    next_url = request.form.get("next", "")
    if next_url.startswith("/") and not next_url.startswith("//") and "\\" not in next_url:
        return redirect(next_url)
    return redirect(url_for("modules.home", _anchor="collection"))


@modules.post("/cart/update")
def update_cart_item():
    try:
        product_id = int(request.form.get("product_id", ""))
        quantity = int(request.form.get("quantity", ""))
    except ValueError:
        flash("اختار كمية صحيحة.", "error")
        return redirect(url_for("modules.view_cart"))
    if quantity < 0 or quantity > 99:
        flash("الكمية لازم تكون من صفر لـ 99.", "error")
        return redirect(url_for("modules.view_cart"))
    cart = session.get("cart", {})
    key = str(product_id)
    if key not in cart:
        flash("المنتج ده مش موجود في سلتك.", "error")
        return redirect(url_for("modules.view_cart"))
    if quantity == 0:
        cart.pop(key)
        flash("شيلنا المنتج من السلة.", "success")
    else:
        cart[key] = quantity
        flash("حدّثنا الكمية في السلة.", "success")
    session["cart"] = cart
    return redirect(url_for("modules.view_cart"))


@modules.post("/checkout/buy/<int:product_id>")
def buy_now(product_id):
    with SessionLocal() as db:
        if db.get(Product, product_id) is None:
            abort(404)
    return redirect(url_for("modules.checkout", product_id=product_id))


@modules.route("/checkout", methods=["GET", "POST"])
def checkout():
    raw_product_id = request.values.get("product_id", "").strip()
    direct_product_id = None
    if raw_product_id:
        try:
            direct_product_id = int(raw_product_id)
        except ValueError:
            abort(400, description="المنتج المطلوب مش صحيح.")

    with SessionLocal() as db:
        if direct_product_id is not None:
            product = db.get(Product, direct_product_id)
            if product is None:
                abort(404)
            checkout_items = [{"product": product, "quantity": 1}]
        else:
            cart = session.get("cart", {})
            quantities = {}
            for product_id, raw_quantity in cart.items():
                try:
                    quantity = int(raw_quantity)
                    parsed_product_id = int(product_id)
                except (TypeError, ValueError):
                    continue
                if 1 <= quantity <= 99:
                    quantities[parsed_product_id] = quantity
            products = db.scalars(select(Product).where(Product.id.in_(quantities))).all() if quantities else []
            checkout_items = [
                {"product": product, "quantity": quantities[product.id]}
                for product in products
            ]

        if not checkout_items:
            flash("السلة فاضية، ضيف منتجات الأول.", "error")
            return redirect(url_for("modules.view_cart"))

        checkout_total = sum(
            (item["product"].current_price * item["quantity"] for item in checkout_items),
            Decimal("0.00"),
        )

        if request.method == "POST":
            customer_name = request.form.get("customer_name", "").strip()
            phone = request.form.get("phone", "").strip()
            address = request.form.get("address", "").strip()
            phone_digits = re.sub(r"\D", "", phone)
            if not 2 <= len(customer_name) <= 120:
                flash("اكتب اسمك بالكامل (من حرفين لـ 120 حرف).", "error")
            elif not re.fullmatch(r"[0-9+()\-\s.]{7,24}", phone) or not 7 <= len(phone_digits) <= 15:
                flash("اكتب رقم موبايل صحيح علشان نقدر نتواصل معاك.", "error")
            elif not 8 <= len(address) <= 500:
                flash("اكتب عنوان التوصيل بالتفصيل (من 8 لـ 500 حرف).", "error")
            else:
                purchase = CustomerOrder(
                    customer_name=customer_name,
                    phone=phone,
                    address=address,
                )
                for item in checkout_items:
                    product = item["product"]
                    purchase.items.append(
                        Order(
                            product_id=product.id,
                            product_name=product.name,
                            quantity=item["quantity"],
                            unit_price=product.current_price,
                        )
                    )
                db.add(purchase)
                db.commit()
                if direct_product_id is None:
                    session["cart"] = {}
                return render_template("order_success.html", order=purchase)

        return render_template(
            "checkout.html",
            checkout_items=checkout_items,
            checkout_total=checkout_total,
            direct_product_id=direct_product_id,
        )


@modules.route("/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_id"):
        return redirect(url_for("modules.admin_dashboard"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        with SessionLocal() as db:
            admin = db.scalar(select(Admin).where(Admin.email == email))
            if admin and check_password_hash(admin.password_hash, password):
                session.clear()
                session["admin_id"] = admin.id
                flash("نورت تاني، دخلت بنجاح.", "success")
                destination = request.args.get("next", "")
                if destination.startswith("/") and not destination.startswith("//"):
                    return redirect(destination)
                return redirect(url_for("modules.admin_dashboard"))
        flash("الإيميل أو الباسورد مش صح.", "error")
    return render_template("admin/login.html")


@modules.post("/admin/logout")
@admin_required
def admin_logout():
    session.clear()
    flash("خرجت من حسابك بنجاح.", "success")
    return redirect(url_for("modules.admin_login"))


@modules.get("/admin")
@admin_required
def admin_dashboard():
    with SessionLocal() as db:
        categories = db.scalars(select(Category).order_by(Category.name)).all()
        products = db.scalars(select(Product).order_by(Product.id.desc())).all()
        customer_orders = db.scalars(
            select(CustomerOrder).order_by(CustomerOrder.created_at.desc(), CustomerOrder.id.desc())
        ).all()
        contact_messages = db.scalars(
            select(ContactMessage).order_by(ContactMessage.created_at.desc(), ContactMessage.id.desc())
        ).all()
        admin = db.get(Admin, session["admin_id"])
        return render_template(
            "admin/dashboard.html",
            categories=categories,
            products=products,
            customer_orders=customer_orders,
            contact_messages=contact_messages,
            order_status_labels={
                "new": "جديد",
                "processing": "جاري التجهيز",
                "completed": "اتسلم",
                "cancelled": "اتلغى",
            },
            admin=admin,
        )


@modules.post("/admin/categories")
@admin_required
def create_category():
    name = request.form.get("name", "").strip()
    if not name or len(name) > 80:
        flash("اكتب اسم القسم، وخليه من حرف لحد 80 حرف.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    with SessionLocal() as db:
        existing = db.scalar(select(Category).where(Category.name.ilike(name)))
        if existing:
            flash("القسم ده موجود عندك بالفعل.", "error")
        else:
            db.add(Category(name=name))
            db.commit()
            flash(f'ضفنا قسم "{name}" للمتجر.', "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/products")
@admin_required
def create_product():
    name = request.form.get("name", "").strip()
    description = request.form.get("description", "").strip()
    image_file = request.files.get("image")
    raw_price = request.form.get("price", "").strip()
    raw_sale_price = request.form.get("sale_price", "").strip()
    raw_category_id = request.form.get("category_id", "").strip()
    if not name or len(name) > 120:
        flash("اكتب اسم المنتج، وخليه من حرف لحد 120 حرف.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    if len(description) > 3000:
        flash("وصف المنتج طويل أكتر من اللازم.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    try:
        price = Decimal(raw_price)
        if not price.is_finite() or price < 0 or price > Decimal("99999999.99"):
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        flash("اكتب سعر صحيح، ولازم يكون صفر أو أكتر.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    sale_price = None
    if raw_sale_price:
        try:
            sale_price = Decimal(raw_sale_price)
            if not sale_price.is_finite() or sale_price <= 0 or sale_price >= price:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            flash("سعر العرض لازم يكون أكبر من صفر وأقل من السعر الأساسي.", "error")
            return redirect(url_for("modules.admin_dashboard"))
    uploaded_filename = ""
    if image_file and image_file.filename:
        safe_original_name = secure_filename(image_file.filename)
        extension = os.path.splitext(safe_original_name)[1].lower()
        file_signature = image_file.stream.read(12)
        image_file.stream.seek(0)
        valid_signatures = {
            ".png": file_signature.startswith(b"\x89PNG\r\n\x1a\n"),
            ".jpg": file_signature.startswith(b"\xff\xd8\xff"),
            ".jpeg": file_signature.startswith(b"\xff\xd8\xff"),
            ".gif": file_signature.startswith((b"GIF87a", b"GIF89a")),
            ".webp": file_signature.startswith(b"RIFF") and file_signature[8:12] == b"WEBP",
        }
        if not valid_signatures.get(extension, False):
            flash("اختار صورة بصيغة JPG أو PNG أو GIF أو WEBP.", "error")
            return redirect(url_for("modules.admin_dashboard"))
        uploaded_filename = f"{uuid.uuid4().hex}{extension}"
    category_id = None
    if raw_category_id:
        try:
            category_id = int(raw_category_id)
        except ValueError:
            flash("اختار قسم صحيح.", "error")
            return redirect(url_for("modules.admin_dashboard"))
    with SessionLocal() as db:
        category = db.get(Category, category_id) if category_id is not None else None
        if category_id is not None and category is None:
            flash("اختار قسم صحيح.", "error")
            return redirect(url_for("modules.admin_dashboard"))
        image_url = ""
        upload_path = ""
        if uploaded_filename:
            upload_directory = os.path.join(current_app.static_folder, "uploads")
            os.makedirs(upload_directory, exist_ok=True)
            upload_path = os.path.join(upload_directory, uploaded_filename)
            image_url = f"/static/uploads/{uploaded_filename}"
            image_file.save(upload_path)
        db.add(
            Product(
                name=name,
                price=price,
                sale_price=sale_price,
                description=description,
                image_url=image_url,
                category=category,
            )
        )
        try:
            db.commit()
        except SQLAlchemyError:
            if upload_path and os.path.isfile(upload_path):
                os.remove(upload_path)
            raise
    flash(f'ضفنا "{name}" للمتجر.', "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/products/<int:product_id>/pricing")
@admin_required
def update_product_pricing(product_id):
    raw_price = request.form.get("price", "").strip()
    raw_sale_price = request.form.get("sale_price", "").strip()
    try:
        price = Decimal(raw_price)
        if not price.is_finite() or price < 0 or price > Decimal("99999999.99"):
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        flash("اكتب سعر صحيح، ولازم يكون صفر أو أكتر.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    sale_price = None
    if raw_sale_price:
        try:
            sale_price = Decimal(raw_sale_price)
            if not sale_price.is_finite() or sale_price <= 0 or sale_price >= price:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            flash("سعر العرض لازم يكون أكبر من صفر وأقل من السعر الأساسي.", "error")
            return redirect(url_for("modules.admin_dashboard"))
    with SessionLocal() as db:
        product = db.get(Product, product_id)
        if product is None:
            abort(404)
        product.price = price
        product.sale_price = sale_price
        db.commit()
    flash("حدّثنا سعر المنتج والعرض بنجاح.", "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/orders/<int:order_id>/status")
@admin_required
def update_order_status(order_id):
    status = request.form.get("status", "")
    valid_statuses = {"new", "processing", "completed", "cancelled"}
    if status not in valid_statuses:
        flash("اختار حالة طلب صحيحة.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    with SessionLocal() as db:
        order = db.get(CustomerOrder, order_id)
        if order is None:
            abort(404)
        order.status = status
        db.commit()
    flash("حدّثنا حالة الطلب.", "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/products/<int:product_id>/delete")
@admin_required
def delete_product(product_id):
    with SessionLocal() as db:
        product = db.get(Product, product_id)
        if product is None:
            abort(404)
        has_orders = db.scalar(select(Order.id).where(Order.product_id == product_id).limit(1))
        if has_orders:
            flash("مش هينفع تمسح منتج عليه طلبات سابقة. تقدر توقف العرض بتاعه بدل كده.", "error")
            return redirect(url_for("modules.admin_dashboard"))
        image_url = product.image_url
        db.delete(product)
        db.commit()
    if image_url.startswith("/static/uploads/"):
        uploaded_filename = os.path.basename(image_url)
        upload_path = os.path.join(current_app.static_folder, "uploads", uploaded_filename)
        if os.path.isfile(upload_path):
            try:
                os.remove(upload_path)
            except PermissionError:
                current_app.logger.warning("Could not remove an uploaded product image because it is in use: %s", uploaded_filename)
                flash("مسحنا المنتج، بس الصورة لسه مستخدمة ومقدروش نمسحها دلوقتي.", "error")
                return redirect(url_for("modules.admin_dashboard"))
    flash("مسحنا المنتج من المتجر.", "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/categories/<int:category_id>/delete")
@admin_required
def delete_category(category_id):
    with SessionLocal() as db:
        category = db.get(Category, category_id)
        if category is None:
            abort(404)
        for product in category.products:
            product.category = None
        db.delete(category)
        db.commit()
    flash("مسحنا القسم، والمنتجات بتاعته لسه موجودة في المتجر.", "success")
    return redirect(url_for("modules.admin_dashboard"))


@modules.post("/admin/account")
@admin_required
def update_admin_account():
    email = request.form.get("email", "").strip().lower()
    new_password = request.form.get("new_password", "")
    current_password = request.form.get("current_password", "")
    if "@" not in email or len(email) > 254:
        flash("اكتب إيميل صحيح.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    if new_password and len(new_password) < 8:
        flash("الباسورد الجديد لازم يكون 8 حروف على الأقل.", "error")
        return redirect(url_for("modules.admin_dashboard"))
    with SessionLocal() as db:
        admin = db.get(Admin, session["admin_id"])
        if admin is None or not check_password_hash(admin.password_hash, current_password):
            flash("اكتب الباسورد الحالي علشان نحفظ التغييرات.", "error")
            return redirect(url_for("modules.admin_dashboard"))
        duplicate = db.scalar(select(Admin).where(Admin.email == email, Admin.id != admin.id))
        if duplicate:
            flash("الإيميل ده مستخدم بالفعل.", "error")
            return redirect(url_for("modules.admin_dashboard"))
        admin.email = email
        if new_password:
            admin.password_hash = generate_password_hash(new_password)
        db.commit()
    flash("حدّثنا بيانات حسابك بنجاح.", "success")
    return redirect(url_for("modules.admin_dashboard"))